export const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  if (!startTime || !durationMinutes) {
    console.log('⚠️ Cannot calculate end time: Missing start time or duration')
    return ''
  }

  try {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)

    const endDate = new Date(startDate.getTime() + durationMinutes * 60000)

    const endHours = String(endDate.getHours()).padStart(2, '0')
    const endMinutes = String(endDate.getMinutes()).padStart(2, '0')

    const result = `${endHours}:${endMinutes}`
    console.log('⏰ End time calculated:', result)
    return result
  } catch (error) {
    console.error('❌ Error calculating end time:', error)
    return ''
  }
}