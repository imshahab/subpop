/**
 * Serverless API route for Vercel.
 * POST /api/translate
 * Body JSON:
 * {
 *   "srt": "<raw srt content>",
 *   "language": "English",           // optional override
 *   "batchCount": 100,               // optional
 *   "model": "gemini-2.5-flash"      // optional
 * }
 *
 * Returns: { srt: "<translated srt>" }
 *
 * To receive it as a downloadable SRT file, you can instead set the
 * query param ?download=1
 */

import { SubtitleTranslator } from '../lib/translator.js'

const LANGUAGES = [
	'English',
	'German',
	'French',
	'Persian',
	'Chinese',
	'Japanese',
	'Indian',
]

const MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash']

export default async function handler(req, res) {
	if (req.method !== 'POST') {
		res.setHeader('Allow', 'POST')
		return res.status(405).json({ error: 'Method Not Allowed' })
	}

	// SSE headers
	res.setHeader('Content-Type', 'text/event-stream')
	res.setHeader('Cache-Control', 'no-cache')
	res.setHeader('Connection', 'keep-alive')
	res.flushHeaders() // send the headers right away.

	function sendEvent(event, data) {
		// check if the stream is open
		if (!res.writable) {
			console.log('Stream is not writable, cannot send event.')
			return
		}
		res.write(`event: ${event}\n`)
		res.write(`data: ${JSON.stringify(data)}\n\n`)
	}

	// Gracefully handle client closing the connection
	req.on('close', () => {
		console.log('Client closed connection. Aborting translation.')
		// Clean up any ongoing processes here if necessary
		res.end() // Ensure the response is ended
	})

	try {
		const { srt, language, batchCount, model } = req.body || {}

		if (!srt || typeof srt !== 'string') {
			// We'll have to send an event instead of JSON here
			// Because we have already sent the headers
			sendEvent('error', { message: 'Missing or invalid "srt" in body' })
			return res.end()
		}

		if (!LANGUAGES.includes(language)) {
			sendEvent('error', { message: 'Invalid "language" in body' })
			return res.end()
		}

		if (!MODELS.includes(model)) {
			sendEvent('error', { message: 'Invalid "model" in body' })
			return res.end()
		}

		if (
			!Number.isInteger(batchCount) ||
			batchCount > 100 ||
			batchCount < 1
		) {
			sendEvent('error', { message: 'Invalid "batchCount" in body' })
			return res.end()
		}

		const translator = new SubtitleTranslator({
			apiKey: process.env.GOOGLE_API_KEY,
			targetLanguage: language || 'English',
			batchCount: batchCount || 100,
			model: model || 'gemini-2.5-flash',
		})

		const translated = await translator.translateSrt(srt, {
			onProgress: (p) => {
				console.log(
					`Progress: ${p.percent}% (batch ${p.batch}/${p.totalBatches})`
				)
				sendEvent('progress', p)
			},
		})
		// The final data is sent here
		sendEvent('done', { srt: translated })
	} catch (err) {
		console.error('An error occurred during translation:', err)
		sendEvent('error', { message: err.message || 'Internal Server Error' })
	} finally {
		if (res.writable) res.end()
	}
}
