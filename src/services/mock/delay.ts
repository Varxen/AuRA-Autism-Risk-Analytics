export const delay = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 400))
