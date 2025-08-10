![logo](/public/logo.png)

# SubPop - Subtitle Translation

SubPop is a web application for translating SRT subtitle files using Google Gemini models. It features a simple drag-and-drop interface, real-time progress updates via Server-Sent Events, and batch processing for efficient translation of large subtitle files.

## Features

-   **Drag & Drop Interface**: Simple file upload with 250KB size limit
-   **Multiple Languages**: Support for English, German, French, Persian, Chinese, Japanese, and Indian
-   **AI Models**: Choose between Gemini 2.5 Flash and Gemini 1.5 Flash
-   **Batch Processing**: Configurable batch sizes (1-100) for optimal performance
-   **Real-time Progress**: Live progress updates with SSE
-   **Persistent Settings**: Settings saved to localStorage
-   **Instant Download**: Download translated SRT files directly

## Getting Started

### Prerequisites

-   Node.js (v18+ recommended)
-   Google API key for Gemini models

### Installation

1. Clone the repository:

    ```sh
    git clone https://github.com/imshahab/subpop.git
    cd subpop
    ```

2. Install dependencies:

    ```sh
    npm install
    ```

3. Set your Google API key:
   Create a `.env` file in the root directory:
    ```env
    GOOGLE_API_KEY=your_google_api_key_here
    ```

### Development

Start the development server:

```sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

Build for production:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

## Usage

1. **Upload**: Drag and drop an SRT file (max 250KB) or click to browse
2. **Configure**: Click the settings button to adjust:
    - Target language
    - AI model (Gemini 2.5 Flash or 1.5 Flash)
    - Batch size for processing
3. **Translate**: File automatically starts translating on upload
4. **Download**: Download the translated SRT file when complete

## Project Structure

```
├── api/
│   └── translate.js          # Serverless API endpoint
├── lib/
│   └── translator.js         # Core translation logic
├── public/
│   ├── logo.png             # App logo
│   └── done.png             # Success icon
├── src/
│   ├── main.js              # Frontend JavaScript
│   └── style.css            # Tailwind CSS imports
├── index.html               # Main HTML file
├── package.json             # Dependencies and scripts
└── vite.config.js           # Vite configuration
```

## Key Components

-   **`SubtitleTranslator`**: Core translation class handling SRT parsing, batching, and Gemini API integration
-   **[API Route](api/translate.js)**: Serverless function providing SSE-based translation endpoint
-   **Frontend**: Interactive UI with file handling, settings management, and progress tracking

## Technologies

-   **Frontend**: Vite, TailwindCSS, Flowbite
-   **Backend**: Serverless API (Vercel compatible)
-   **AI**: Google Gemini API (`@google/genai`)
-   **Streaming**: Server-Sent Events with `@microsoft/fetch-event-source`

## API Endpoint

**POST** `/api/translate`

Request body:

```json
{
	"srt": "<raw srt content>",
	"language": "English",
	"batchCount": 100,
	"model": "gemini-2.5-flash"
}
```

Returns Server-Sent Events:

-   `progress`: Translation progress updates
-   `done`: Final translated SRT content
-   `error`: Error messages

## Environment Variables

-   `GOOGLE_API_KEY`: Your Google API key for Gemini models

## License

MIT
