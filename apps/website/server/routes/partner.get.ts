import { defineEventHandler, sendRedirect } from 'h3'

export default defineEventHandler(async (event) => {
  return sendRedirect(event, 'https://simy.ch/partner', 301)
})
