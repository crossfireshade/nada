export async function downloadPhoto(url, guestName, ext) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const extension = ext || url.substring(url.lastIndexOf('.')) || '.png'
    const filename = guestName ? `${guestName}${extension}` : `photo${extension}`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  } catch {
    window.open(url, '_blank')
  }
}
