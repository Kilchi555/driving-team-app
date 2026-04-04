import { defineEventHandler, sendRedirect } from 'h3'

export default defineEventHandler(async (event) => {
  return sendRedirect(event, 'https://www.simy.ch/partner', 301)
})
