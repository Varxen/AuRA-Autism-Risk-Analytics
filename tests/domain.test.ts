import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mockQuestions } from '../src/data/mockQuestions.ts'
import {
  scoreAnswer,
  getAssessmentStage,
  canCompleteAssessment,
} from '../src/utils/assessment.ts'
import { mockAssessmentService } from '../src/services/mock/mockAssessmentService.ts'
import { mockChatService } from '../src/services/mock/mockChatService.ts'

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
    1,
  )
})

test('assessment requires structured answer, preserves original text, blocks unavailable content and completion', async () => {
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
  assert.equal(session.status, 'awaiting-content')
  assert.equal(canCompleteAssessment(session, mockQuestions), false)
  assert.deepEqual(mockAssessmentService.getProgress(session), {
    current: 2,
    total: 13,
    answered: 1,
    canComplete: false,
  })
  await assert.rejects(() =>
    mockAssessmentService.saveStructuredAnswer(session, 'always'),
  )
  await assert.rejects(() => mockAssessmentService.nextQuestion(session))
  const reloaded = await mockAssessmentService.createSession()
  assert.equal(reloaded.answers.length, 0)
})

test('chat returns fixed reference education and action choices', async () => {
  const conversation = await mockChatService.createConversation()
  assert.equal(conversation.messages[0].actions?.length, 2)
  const messages = await mockChatService.respond(
    conversation.id,
    'I want to know about ASD',
    'education',
  )
  assert.equal(messages[0].type, 'education')
  assert.match(messages[0].content, /Autism Spectrum Disorder/)
  assert.equal(messages[1].actions?.[1].id, 'assessment')
  const fallback = await mockChatService.respond(
    conversation.id,
    'What is my child’s risk?',
  )
  assert.match(fallback[0].content, /predefined responses/)
})
