const express = require('express')
const app = express()
const cors = require('cors')
const http = require('http')
const qrcode = require('qrcode-terminal')
const fs = require('fs')
const { Client, LocalAuth, MessageMedia, Buttons } = require('whatsapp-web.js')

// const contacts = require('./assets/contacts')

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// Path where the session data will be stored
const SESSION_FILE_PATH = './session.json'

// Load the session data if it has been previously saved
if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionData = require(SESSION_FILE_PATH)
}

const client = new Client({
  puppeteer: {
    executablePath: '/usr/bin/brave-browser-stable',
  },
  authStrategy: new LocalAuth({
    clientId: 'client-one',
  }),
  puppeteer: {
    headless: false,
  },
})

client.on('qr', (code) => {
  qrcode.generate(code, { small: true })
})

client.on('ready', () => {
  console.log('Cliente pronto para enviar mensagens')
})

client.on('authenticated', (session) => {
  console.log('WHATSAPP WEB => Authenticated')
})

app.post('/send-simple-message', async (req, res) => {
  const { numero, mensagem } = req.body

  try {
    const chatId = await client.getNumberId(numero)

    const result = await client.sendMessage(chatId._serialized, mensagem)

    res.status(200).json(result)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erro ao enviar mensagem' })
  }
})

app.post('/send-image', async (req, res) => {
  try {
    const { numero, mensagem } = req.body
    const chatId = await client.getNumberId(numero)

    const media = MessageMedia.fromFilePath('src/assets/image.jpeg')

    client.sendMessage(chatId._serialized, media, {
      caption: mensagem,
    })

    res.status(200).json('Mensagem enviada')
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erro ao enviar imagem' })
  }
})

app.post('/send-messages', async (req, res) => {
  try {
    const { mensagem } = req.body

    const sussefullyContacts = []
    const failedContacts = []

    for await (const contact of contacts) {
      const chatId = await client.getNumberId(contact.number)

      if (chatId) {
        const media = MessageMedia.fromFilePath('src/assets/image.jpeg')

        const result = await client.sendMessage(chatId._serialized, media, {
          caption: mensagem,
        })

        if (!result) {
          console.error(
            `Falha ao enviar mensagem para ${contact.name} (${contact.number})`
          )
        }

        sussefullyContacts.push({
          nome: contact.nome,
          whatsapp: contact.number,
        })

        console.log(`Mensagem enviada para ${contact.name} (${contact.name})`)
      } else {
        failedContacts.push({
          nome: contact.nome,
          whatsapp: contact.number,
        })

        console.error(
          `Falha ao enviar mensagem para ${contact.name} (${contact.name})`
        )
      }
    }

    res
      .status(200)
      .json({ mensage: 'Mensagem enviada', sussefullyContacts, failedContacts })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erro ao enviar imagem' })
  }
})

app.get('/validate', (req, res) => {
  const numberCounts = {}
  const filteredContacts = []

  for (const contact of contacts) {
    const { number } = contact

    if (!numberCounts[number]) {
      numberCounts[number] = 1
    } else if (numberCounts[number] === 1) {
      filteredContacts.push(contact)
      numberCounts[number]++
    }
  }

  res.status(200).json({
    total: contacts.length,
    duplicatedCount: filteredContacts.length,
    duplicated: filteredContacts,
  })
})

client.on('auth_failure', (message) => {
  console.error('Falha na autenticação', message)
})

client.on('message', (message) => {
  if (message.body === 'Ping' || message.body === 'ping') {
    message.reply('Pong')
  } else {
    client.sendMessage(message.from, 'Hello')
  }
})

const server = http.createServer(app)

client.initialize()

const PORT = +process.env.PORT || 3333
const HOST = '0.0.0.0'

server.listen(PORT, HOST)

console.log(`Server is running!`)
