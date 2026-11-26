/** A picture for a question becomes a JPEG no wider than 720 pixels, small enough to keep with the question. */
export function fileToPic(file: Blob): Promise<string> {
  return new Promise((res, rej) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) return rej(new Error('Pick a PNG, JPG or WebP picture.'));
    if (file.size > 15e6) return rej(new Error('That picture is too big. Pick one under 15 MB.'));
    const url = URL.createObjectURL(file), im = new Image();
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That picture could not be opened.')); };
    im.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const W = 720, k = Math.min(1, W / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(im, 0, 0, w, h);
        let o = c.toDataURL('image/jpeg', 0.72);
        if (o.length > 200000) o = c.toDataURL('image/jpeg', 0.5);
        o.length < 240000 ? res(o) : rej(new Error('That picture is too detailed. Try a simpler one.'));
      } catch { rej(new Error('That picture could not be used. Try another.')); }
    };
    im.src = url;
  });
}
