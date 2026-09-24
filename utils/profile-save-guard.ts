/** Blocks profile submit while the fresh profile is still loading or a save is in flight. */
export function profileEditSubmitBlocked(state: {
  isLoadingProfile: boolean
  isSavingProfile: boolean
}): boolean {
  return state.isLoadingProfile === true || state.isSavingProfile === true
}
