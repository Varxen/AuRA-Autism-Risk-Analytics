import { getHistoryEntries } from '../src/utils/history.ts'
import type { Conversation } from '../src/types/chat.types'
import type { AssessmentSession } from '../src/types/assessment.types'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mockQuestions, QUESTIONNAIRE_VERSION, getQuestionnaireQuestions } from '../src/data/mockQuestions.ts'
import {
  scoreAnswer,
  getAssessmentStage,
  canCompleteAssessment,
} from '../src/utils/assessment.ts'
import { mockAssessmentService } from '../src/services/mock/mockAssessmentService.ts'
import { chatReplyService } from '../src/services/api/chatReplyService.ts'

test('Q1–Q9 and Q10–Q13 preserve both documented scoring scales', () => {
  assert.equal(mockQuestions.length, 13)
  for (const question of mockQuestions) {
    const expected =
      question.questionNumber <= 9
        ? { always: 0, sometimes: 1, never: 2 }
        : { yes: 2, sometimes: 1, no: 0 }
    for (const [id, score] of Object.entries(expected))
      assert.equal(scoreAnswer(question, id), score)
    assert.throws(() => scoreAnswer(question, 'unknown'))
  }
  assert.equal(
    mockQuestions.filter((question) => question.mainQuestion).length,
    13,
  )
  assert(mockQuestions.every((question) => question.contentStatus === 'approved' && question.followUpQuestion))
  assert.equal(mockQuestions[0].indicatorLabel, 'Response to Name')
  assert.equal(mockQuestions[1].indicatorLabel, 'Eye Contact')
  assert(mockQuestions[11].followUpQuestion?.includes('meeting a new person. How does your child usually react?'))
})

test('assessment preserves original answers across all 13 items and completes without a risk classification', async () => {
  let session = await mockAssessmentService.createSession()
  assert.equal(getAssessmentStage(session), 'question')
  await assert.rejects(() =>
    mockAssessmentService.saveFollowUp(session, 'too early'),
  )
  await assert.rejects(() => mockAssessmentService.nextQuestion(session))
  await assert.rejects(() =>
    mockAssessmentService.saveStructuredAnswer(session, 'yes'),
  )
  const original = session
  session = await mockAssessmentService.saveStructuredAnswer(
    session,
    'sometimes',
  )
  assert.equal(original.answers.length, 0)
  assert.equal(session.answers[0].structuredScore, 1)
  assert.equal(getAssessmentStage(session), 'follow-up')
  await assert.rejects(() =>
    mockAssessmentService.saveStructuredAnswer(session, 'always'),
  )
  await assert.rejects(() => mockAssessmentService.saveFollowUp(session, '  '))
  await assert.rejects(() =>
    mockAssessmentService.saveFollowUp(session, 'x'.repeat(4001)),
  )
  const response = '  Sometimes he look, but not always  '
  session = await mockAssessmentService.saveFollowUp(session, response)
  assert.equal(session.answers[0].followUpText, response)
  assert.equal(session.answers[0].questionId, 'q1')
  assert.equal(session.answers[0].selectedOptionId, 'sometimes')
  assert.equal(getAssessmentStage(session), 'ready-next')
  await assert.rejects(() =>
    mockAssessmentService.saveFollowUp(session, 'duplicate'),
  )
  session = await mockAssessmentService.nextQuestion(session)
  assert.equal(session.currentQuestionIndex, 1)
  assert.equal(session.status, 'in-progress')
  assert.equal(getAssessmentStage(session), 'question')
  assert.equal(canCompleteAssessment(session, mockQuestions), false)
  assert.deepEqual(mockAssessmentService.getProgress(session), {
    current: 2, total: 13, answered: 1, canComplete: false,
  })
  for (const question of mockQuestions.slice(1)) {
    assert.equal(session.currentQuestionIndex + 1, question.questionNumber)
    assert.equal(getAssessmentStage(session), 'question')
    session = await mockAssessmentService.saveStructuredAnswer(session, question.questionNumber <= 9 ? 'never' : 'yes')
    assert.equal(session.answers.at(-1)?.structuredScore, 2)
    await assert.rejects(() => mockAssessmentService.nextQuestion(session))
    session = await mockAssessmentService.saveFollowUp(session, `  Original observation for ${question.id}.  `)
    assert.equal(session.answers.at(-1)?.followUpText, `  Original observation for ${question.id}.  `)
    if (question.questionNumber === 13) {
      assert.equal(canCompleteAssessment(session, mockQuestions), true)
      const incomplete = { ...session, answers: session.answers.slice(1) }
      await assert.rejects(() => mockAssessmentService.nextQuestion(incomplete))
      assert.equal(canCompleteAssessment({ ...session, questionnaireVersion: 'outdated' }, mockQuestions), false)
      assert.equal(canCompleteAssessment(session, mockQuestions.map((item, index) => index === 0 ? { ...item, contentStatus: 'awaiting-approval' } : item)), false)
      assert.equal(canCompleteAssessment({ ...session, answers: session.answers.map((item, index) => index === 0 ? { ...item, structuredScore: 99 } : item) }, mockQuestions), false)
    }
    session = await mockAssessmentService.nextQuestion(session)
  }
  assert.equal(session.questionnaireVersion, QUESTIONNAIRE_VERSION)
  assert.equal(session.status, 'completed')
  assert.equal(getAssessmentStage(session), 'completed')
  assert.equal(session.answers.length, 13)
  assert.equal(new Set(session.answers.map((answer) => answer.questionId)).size, 13)
  assert.equal(session.currentQuestionIndex, 12)
  assert(session.completedAt && !Number.isNaN(Date.parse(session.completedAt)))
  assert.equal(session.answers[0].followUpText, response)
  assert(!('riskLevel' in session))
  assert.deepEqual(mockAssessmentService.getProgress(session), { current: 13, total: 13, answered: 13, canComplete: true })
  await assert.rejects(() => mockAssessmentService.nextQuestion(session))
  await assert.rejects(() => mockAssessmentService.saveStructuredAnswer(session, 'yes'))
  await assert.rejects(() => mockAssessmentService.saveFollowUp(session, 'duplicate'))
  const reloaded = await mockAssessmentService.createSession()
  assert.equal(reloaded.answers.length, 0)
})

test('chat returns fixed reference education and action choices', async () => {
  const conversation = await chatReplyService.createConversation()
  assert.equal(conversation.messages[0].actions?.length, 2)
  const messages = await chatReplyService.respond(
    conversation.id,
    'I want to know about ASD',
    'education',
  )
  assert.equal(messages[0].type, 'education')
  assert.match(messages[0].content, /Autism Spectrum Disorder/)
  assert.equal(messages[1].actions?.[1].id, 'assessment')
  const fallback = await chatReplyService.respond(
    conversation.id,
    'What is the weather tomorrow?',
  )
  assert.match(fallback[0].content, /could not find that in my information knowledge base/)
})


test('processing preview fills fictional gaps while preserving existing responses and completion validation', async () => {
  let current = await mockAssessmentService.createSession()
  current = await mockAssessmentService.saveStructuredAnswer(current, 'always')
  current = await mockAssessmentService.saveFollowUp(current, '  Keep this original fictional observation.  ')
  const before = structuredClone(current)
  const preview = await mockAssessmentService.createProcessingPreview(current)
  assert.deepEqual(current, before)
  assert.deepEqual(preview.answers[0], current.answers[0])
  assert.equal(preview.id, current.id)
  assert.equal(preview.isDemoPreview, true)
  assert.equal(preview.status, 'completed')
  assert.equal(preview.currentQuestionIndex, 12)
  assert.equal(preview.answers.length, 13)
  assert.equal(new Set(preview.answers.map((answer) => answer.questionId)).size, 13)
  assert.equal(canCompleteAssessment(preview, mockQuestions), true)
  assert(preview.answers.slice(1).every((answer) => answer.followUpText.startsWith('[Demo preview]') && answer.structuredScore === 1))
  assert(!('riskLevel' in preview))
  await assert.rejects(() => mockAssessmentService.createProcessingPreview({ ...current, questionnaireVersion: 'outdated' }))
})


test('Filipino questionnaire uses stable IDs and scores, preserves original responses, and keeps its session language', async () => {
  const filipino = getQuestionnaireQuestions('fil')
  assert.equal(filipino.length, 13)
  for (const [index, question] of filipino.entries()) {
    const english = mockQuestions[index]
    assert.equal(question.id, english.id)
    assert.equal(question.indicatorId, english.indicatorId)
    assert.equal(question.questionnaireVersion, english.questionnaireVersion)
    assert.equal(question.language, 'fil')
    assert.deepEqual(question.options.map(({ id, score }) => ({ id, score })), english.options.map(({ id, score }) => ({ id, score })))
    assert(question.mainQuestion && question.followUpQuestion)
    assert.notEqual(question.mainQuestion, english.mainQuestion)
  }
  assert.deepEqual(filipino[0].options.map((option) => option.label), ['Palagi', 'Minsan', 'Hindi kailanman'])
  assert.deepEqual(filipino[9].options.map((option) => option.label), ['Oo', 'Minsan', 'Hindi'])
  let session = await mockAssessmentService.createSession('fil')
  assert.equal(session.language, 'fil')
  session = await mockAssessmentService.saveStructuredAnswer(session, 'sometimes')
  assert.equal(session.answers[0].structuredScore, 1)
  const original = '  Minsan tumitingin siya, pero hindi palagi.  '
  session = await mockAssessmentService.saveFollowUp(session, original)
  session = await mockAssessmentService.nextQuestion(session)
  assert.equal(session.language, 'fil')
  assert.equal(session.answers[0].followUpText, original)
  const preview = await mockAssessmentService.createProcessingPreview(session)
  assert.equal(preview.language, 'fil')
  assert.equal(preview.answers[0].followUpText, original)
  assert(preview.answers[1].followUpText.includes('Kathang-isip'))
  assert.equal(canCompleteAssessment(preview, filipino), true)
  assert.equal(canCompleteAssessment(preview, mockQuestions), false)
  await assert.rejects(() => Reflect.apply(mockAssessmentService.createSession, mockAssessmentService, ['fr']))
})


test('history combines sessions by ID, preserves originals, orders recent activity and reflects processing state', () => {
  const conversation: Conversation = {
    id: 'chat-history',
    messages: [{ id: 'message-history', conversationId: 'chat-history', role: 'user', type: 'text', content: '  My original\nchat question  ', timestamp: '2026-10-22T01:00:00.000Z' }],
  }
  const assessment: AssessmentSession = {
    id: 'assessment-history', language: 'fil', questionnaireVersion: QUESTIONNAIRE_VERSION,
    status: 'completed', currentQuestionIndex: 12, answers: [],
    startedAt: '2026-10-22T00:00:00.000Z', completedAt: '2026-10-22T02:00:00.000Z', isDemoPreview: true,
  }
  const before = JSON.stringify({ conversation, assessment })
  const entries = getHistoryEntries([conversation], [assessment], [])
  assert.equal(entries.length, 2)
  assert.equal(entries[0].id, assessment.id)
  assert.equal(entries[0].kind, 'assessment')
  assert.equal(entries[0].status, 'Processing preview')
  assert.equal(entries[0].isDemoPreview, true)
  assert(entries[0].title.includes('Tagalog'))
  assert.equal(entries[1].title, 'My original chat question')
  assert.equal(entries[1].id, conversation.id)
  assert.equal(getHistoryEntries([], [assessment], [assessment.id])[0].status, 'Completed')
  assert.equal(JSON.stringify({ conversation, assessment }), before)
  assert.deepEqual(getHistoryEntries([], [], []), [])
})
