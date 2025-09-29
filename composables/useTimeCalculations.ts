export const useTimeCalculations = (formData: any) => {
  const calculateEndTime = () => {
    if (!formData.value.startTime || !formData.value.duration_minutes) {
      formData.value.endTime = ''
      return
    }

    const [hours, minutes] = formData.value.startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)

    const endDate = new Date(startDate.getTime() + formData.value.duration_minutes * 60000)

    const endHours = String(endDate.getHours()).padStart(2, '0')
    const endMinutes = String(endDate.getMinutes()).padStart(2, '0')

    formData.value.endTime = `${endHours}:${endMinutes}`
    console.log('⏰ End time calculated:', {
      startTime: formData.value.startTime,
      duration: formData.value.duration_minutes,
      endTime: formData.value.endTime
    })
  }

  return { calculateEndTime }
}