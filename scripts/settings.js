const defaults = {
    resolution: 'medium',
    shadows: 'medium',
    vhs: 'on',
    aa: 'fxaa',
    bloom: 'on',
    mastervol: 80,
    sfxVol: 70,
    ambiencevol: 60,
    sensitivity: 50,
    fov: 75
}
export const gamesettings = {
    ...defaults,
    ...JSON.parse(localStorage.getItem('gamesettings') || '{}')
}
Object.keys(defaults).forEach((id) => {
    const el = document.getElementById(id)
    if(!el) return;
    el.value = gamesettings[id]
    el.addEventListener(el.type === 'range' ? 'input' : 'change', () => {
    gamesettings[id] = el.type === 'range' ? Number(el.value) : el.value;
    localStorage.setItem('gamesettings', JSON.stringify(gamesettings));
    window.dispatchEvent(new Event('settingschange'));
  });
})