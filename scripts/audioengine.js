const hoversound = new Audio('./assets/sounds/UI/clicksound1.ogg')
const startbtn = document.getElementById('start')
startbtn.addEventListener('mouseenter', () => {
    hoversound.volume = 0.5
    hoversound.currentTime = 0
    hoversound.play()
})
const exitbtn = document.getElementById('quit')
exitbtn.addEventListener('mouseenter', () => {
    hoversound.volume = 0.5
    hoversound.currentTime = 0
    hoversound.play()
})
const settings = document.getElementById('settings')
settings.addEventListener('mouseenter', () => {
    hoversound.volume = 0.5
    hoversound.currentTime = 0
    hoversound.play()
})
