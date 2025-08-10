import { Modal } from 'flowbite'
import { fetchEventSource } from '@microsoft/fetch-event-source'

// Global state variables
let language = ''
let batchCount = 0
let model = ''

// Initialize settings from localStorage or set defaults
if (localStorage.getItem('language')) {
	language = localStorage.getItem('language')
}
if (localStorage.getItem('batchCount')) {
	batchCount = localStorage.getItem('batchCount')
}
if (localStorage.getItem('model')) {
	model = localStorage.getItem('model')
} else {
	language = 'English'
	batchCount = 100
	model = 'gemini-2.5-flash'
	updateLocalStorage()
}

let srt = ''
let translatedText = ''

// DOM elements
const settingsModalEl = document.getElementById('settings-modal')
const settingsModal = new Modal(settingsModalEl)
const saveSettingsButtonEl = document.getElementById('save-settings-button')
const modalToggleButtonEl = document.getElementById('settings-button')
const srtFileInputEl = document.getElementById('srt-file-input')
const srtFileBoxEl = document.getElementById('srt-file-box')
const loadingIndicatorEl = document.getElementById('loading-indicator')
const progressTextEl = document.getElementById('progress-text')
const progressBarEl = document.getElementById('progress-bar')
const translateCompleteMessageEl = document.getElementById(
	'translate-complete-message'
)
const translateMoreButtonEl = document.getElementById('translation-more-button')
const downloadButtonEl = document.getElementById('download-button')

// Event listeners
modalToggleButtonEl.addEventListener('click', () => {
	document.getElementById('target-language').value = language
	document.getElementById('batch-size').value = batchCount
	document.getElementById('llm-model').value = model

	// Show the modal
	settingsModal.toggle()
})

saveSettingsButtonEl.addEventListener('click', () => {
	const enteredLanguage = document.getElementById('target-language').value
	const enteredBatchSize = Number(document.getElementById('batch-size').value)
	const enteredModel = document.getElementById('llm-model').value

	if (
		!Number.isInteger(enteredBatchSize) ||
		enteredBatchSize > 100 ||
		enteredBatchSize < 1
	) {
		alert('Enter a valid batch size.')
	} else {
		language = enteredLanguage
		batchCount = enteredBatchSize
		model = enteredModel
		updateLocalStorage()
	}

	// Hide the modal
	settingsModal.hide()
})

srtFileInputEl.addEventListener('change', async (event) => {
	const file = event.target.files?.[0] // first selected file
	if (!file) {
		return
	}

	if (file.size > 250 * 1024) {
		alert('File size exceeds 250KB limit.')
		srtFileInputEl.value = '' // Clear the input
		return
	}

	const fileText = await file.text()
	srt = fileText
	// Submit the form
	submit()
})

translateMoreButtonEl.addEventListener('click', () => {
	reset()
})

downloadButtonEl.addEventListener('click', () => {
	triggerClientDownload(translatedText)
})

// Utility functions
function updateLocalStorage() {
	localStorage.setItem('language', language)
	localStorage.setItem('batchCount', batchCount)
	localStorage.setItem('model', model)
}

async function submit() {
	const raw = srt.trim()
	if (!raw) {
		alert('Please upload an SRT file first.')
		return
	}

	srtFileBoxEl.style.display = 'none'
	loadingIndicatorEl.style.display = 'flex'
	progressTextEl.textContent = 'Starting translation...'
	progressBarEl.style.width = '0%'

	try {
		// Request server to return file directly
		translatedText = await fetchDownload(raw, {
			language,
			batchCount: Number(batchCount),
			model,
		})
		triggerClientDownload(translatedText)
		translateCompleteMessageEl.style.display = 'flex'
	} catch (err) {
		console.error(err)
		alert('Translation failed: ' + (err.message || 'Unknown error'))
		reset()
	} finally {
		loadingIndicatorEl.style.display = 'none'
	}
}

async function fetchDownload(srt, { language, batchCount, model }) {
	return new Promise((resolve, reject) => {
		fetchEventSource('/api/translate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ srt, language, batchCount, model }),
			openWhenHidden: true, // keep connection when tab hidden

			onmessage(ev) {
				if (ev.event === 'progress') {
					const data = JSON.parse(ev.data)
					const percent = data.percent || 0
					progressTextEl.textContent = `Translating... ${percent}%`
					progressBarEl.style.width = `${percent}%`
				}

				if (ev.event === 'done') {
					const data = JSON.parse(ev.data)
					progressTextEl.textContent = 'Translation complete!'
					progressBarEl.style.width = '100%'
					resolve(data.srt)
				}
			},

			onerror(err) {
				alert('An error occurred')
				reset()
				reject(new Error(err || 'Server error'))
			},
		})
	})
}

function reset() {
	srtFileBoxEl.style.display = 'flex'
	loadingIndicatorEl.style.display = 'none'
	translateCompleteMessageEl.style.display = 'none'
	srtFileInputEl.value = '' // Clear the input
	srt = '' // Reset saved content
	translatedText = '' // Reset saved content
}

function triggerClientDownload(text) {
	const blob = new Blob([text], {
		type: 'application/x-subrip;charset=utf-8',
	})
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = 'translated.srt'
	document.body.appendChild(a)
	a.click()
	a.remove()
	URL.revokeObjectURL(url)
}
