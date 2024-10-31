# Next.js Chat Application with Ollama Integration

This is a Next.js project that implements a chat application with Ollama integration, Supabase backend, and document processing capabilities.

## Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- Docker Desktop installed (for Supabase local development)
- Ollama installed locally
- Git

### 1. Git Installation
- **Windows**: Download and install from [git-scm.com](https://git-scm.com/download/windows)
- **macOS**: 
  ```bash
  brew install git
  ```
- **Linux**:
  ```bash
  sudo apt-get update
  sudo apt-get install git
  ```

### 2. Ollama Installation

#### macOS
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

#### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

#### Windows
1. Install WSL2 if not already installed:
   ```powershell
   wsl --install
   ```
2. Follow Linux installation instructions within WSL2

Verify installation:
```bash
ollama --version
```

### 3. Supabase Local Setup

1. Install Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)

2. Install Supabase CLI:
```bash
# Using npm
npm install -g supabase

# Using pnpm
pnpm add -g supabase-cli
```

3. Initialize Supabase:
```bash
# Initialize Supabase project
npx supabase init

# Start Supabase services locally
npx supabase start
```

4. Set up the database schema:
```bash
# Apply database migrations
npx supabase db reset
```

Note: The first time you run these commands, it may take a few minutes to download and start all Supabase services. Make sure Docker Desktop is running before executing these commands.

The local Supabase instance will provide you with:
- API URL (typically http://localhost:54321)
- anon key
- service_role key

Add these to your `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
```

### Useful Supabase Commands
```bash
# Start Supabase
supabase start

# Stop Supabase
supabase stop

# View status
supabase status

# Reset database
supabase db reset

# Access database directly
supabase db studio
```

## Project Setup

1. Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd chat-app
pnpm install
```

2. Set up environment variables:
Create a `.env.local` file in the root directory with the following variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_MODEL=llama3.1:latest
```

3. Initialize Supabase:
```bash
# Initialize Supabase project
npx supabase init

# Start Supabase services locally
npx supabase start
```

4. Set up the database schema:
```bash
# Apply database migrations
npx supabase db reset
```

5. Install required Ollama models:
```bash
ollama pull llama3.1
ollama pull mxbai-embed-large
```

## Development Setup

1. Install UI components and dependencies:
```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button alert-dialog
```

2. Install additional dependencies:
```bash
pnpm add react-textarea-autosize ai @ai-sdk/openai remark-gfm react-markdown
pnpm add -D @tailwindcss/typography
```

## Running the Application

1. Start the Ollama server:
```bash
OLLAMA_HOST=localhost OLLAMA_ORIGINS=* ollama serve
```

2. In a new terminal, start the development server:
```bash
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- Real-time chat interface
- Document upload and processing (Markdown and PDF)
- Vector embeddings for semantic search
- Multiple chat contexts
- Custom model selection
- Dark/Light mode support

## Project Structure

- `/app` - Next.js 13+ app directory
- `/components` - React components
- `/lib` - Utility functions and shared logic
- `/public` - Static assets
- `/supabase` - Supabase configuration and migrations

## Additional Configuration

### Tailwind CSS

The project uses Tailwind CSS for styling. Configuration can be found in:
- `tailwind.config.ts`
- `app/globals.css`

### API Routes

- `/api/ollama` - Handles Ollama model interactions
- `/api/uploadMarkdown` - Handles document uploads
- `/api/convertPdf` - Handles PDF conversion

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Remote Access Setup

If you need to access the application from a remote server, use SSH port forwarding:

### Development Server
```bash
# Forward port 3000 for Next.js development server
ssh -L 3000:localhost:3000 username@hostname
```

### Supabase and Ollama
```bash
# Forward all necessary ports (Next.js, Supabase, and Ollama)
ssh -L 3000:localhost:3000 -L 54321:localhost:54321 -L 11434:localhost:11434 username@hostname
```

