import { GoogleGenAI } from '@google/genai'

/**
 * Core translation utilities.
 */

export class SubtitleTranslator {
	constructor({
		model = 'gemini-2.5-flash',
		targetLanguage = 'English',
		batchCount = 100,
		apiKey,
	} = {}) {
		if (!apiKey) throw new Error('Missing Google API key')
		this.model = model
		this.targetLanguage = targetLanguage
		this.batchCount = batchCount
		this.ai = new GoogleGenAI({ apiKey })
	}

	makePrompt(content, lang) {
		return `Translate the following numbered subtitle lines into ${lang}.

                Return only the translations, keeping the same numbering format.
                Do not include any extra comments, summaries, headers, or explanations.

                Example format:
                1. Hello!
                2. How are you?

                Content:
                ${content}`
	}

	parseSrt(content) {
		// Normalize all possible newlines (\r, \r\n) into \n
		content = content.replace(/\r\n?/g, '\n')

		let scraps = content.split('\n\n')
		let timestamps = []
		const parsedSrt = scraps.map((scrap, i) => {
			const parts = scrap.trim().split('\n')
			if (parts.length < 3) {
				console.warn(`Skipping malformed SRT entry at index ${i}`)
				return null
			}
			const number = parts[0]
			const timestamp = parts[1]
			const rest = parts.slice(2).join(' ')
			timestamps.push(timestamp)
			return `${number}.${rest}`
		})
		// Filter out null entries
		return {
			parsedSrt: parsedSrt.filter((item) => item !== null),
			timestamps,
		}
	}

	batchSrt(scraps) {
		const batches = []
		for (let i = 0; i < scraps.length; i += this.batchCount) {
			batches.push(scraps.slice(i, i + this.batchCount).join('\n'))
		}
		return batches
	}

	async translateChunk(content, retries = 3) {
		for (let attempt = 1; attempt <= retries; attempt++) {
			try {
				const response = await this.ai.models.generateContent({
					model: this.model,
					contents: this.makePrompt(content, this.targetLanguage),
				})
				return response.text
			} catch (err) {
				console.error(`Attempt ${attempt} failed:`, err.message)
				if (attempt === retries) throw err
				await new Promise((r) => setTimeout(r, 1000 * attempt))
			}
		}
	}

	parseResponseSrt(content) {
		let scraps = content.split('\n')
		return scraps.map((scrap, i) => {
			scrap = scrap.trim()
			const match = scrap.match(/^(\d+)\.\s*(.+)$/)
			if (!match) {
				console.warn(
					`Could not parse translated line at index ${i}: ${scrap}`
				)
				return `${i + 1}\n${scrap}` // fallback
			}
			return `${match[1]}\n${match[2]}`
		})
	}

	insertTimestamps(scraps, timestamps) {
		const timedScraps = scraps.map((scrap, i) => {
			const firstNewLine = scrap.indexOf('\n')
			return `${scrap.slice(0, firstNewLine + 1)}${
				timestamps[i]
			}${scrap.slice(firstNewLine)}`
		})

		return timedScraps.join('\n\n')
	}

	async translateSrt(srtContent, { onProgress } = {}) {
		const { parsedSrt, timestamps } = this.parseSrt(srtContent)
		const batches = this.batchSrt(parsedSrt)
		const translated = []
		for (let i = 0; i < batches.length; i++) {
			const raw = await this.translateChunk(batches[i])
			const parsed = this.parseResponseSrt(raw)
			const subsetTimestamps = timestamps.slice(
				i * this.batchCount,
				(i + 1) * this.batchCount
			)
			const timed = this.insertTimestamps(parsed, subsetTimestamps)
			translated.push(timed)
			onProgress({
				batch: i + 1,
				totalBatches: batches.length,
				percent: Math.round(((i + 1) / batches.length) * 100),
			})
		}
		return translated.join('\n\n') + '\n'
	}
}
