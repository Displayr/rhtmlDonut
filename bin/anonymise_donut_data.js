const fs = require('fs')

const filePath = process.argv[2]

if (!fs.existsSync(filePath)) {
  console.error(`filePath ${filePath} does not exist`)
  process.exit(1)
}

const fileContentsString = fs.readFileSync(filePath, 'utf8')
const donutConfig = JSON.parse(fileContentsString)

donutConfig.labels = donutConfig.labels.map(stringAnonymiser)
donutConfig.settings.title = stringAnonymiser(donutConfig.settings.title)
donutConfig.settings.subtitle = stringAnonymiser(donutConfig.settings.subtitle)
donutConfig.settings.footer = stringAnonymiser(donutConfig.settings.footer)

if (Array.isArray(donutConfig.settings.groups)) {
  donutConfig.settings.groups = donutConfig.settings.groups.map(stringAnonymiser)
  donutConfig.settings.groupsNames = donutConfig.settings.groupsNames.map(stringAnonymiser)
}

fs.writeFileSync(filePath, JSON.stringify(donutConfig, {}, 2), 'utf8')

function stringAnonymiser (inputString) {
  const charsToPreserve = [
    '-',
    ' ',
    '$',
    ',',
    '.',
    '&',
    '/',
    '(',
    ')',
    '+',
  ]

  const isNumeric = (char) => char.match(/[0-9]/)
  const isCaps = (char) => char.match(/[A-Z]/)

  return inputString.split('').map(char => {
    if (charsToPreserve.includes(char)) { return char }
    if (isNumeric(char)) { return 1 }
    if (isCaps(char)) { return 'X' }
    return 'x'
  }).join('')
}
