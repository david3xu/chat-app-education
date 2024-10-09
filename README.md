This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

# command for the project: 
npx create-next-app@latest chatApp --typescript --tailwind --eslint
`src/`  No
App Router? Yes
import alias No

cd chat-app
cursor .

pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button alert-dialog

<!-- npm i react-textarea-autosize ai @ai-sdk/openai remark-gfm react-markdown -->
pnpm add react-textarea-autosize ai @ai-sdk/openai remark-gfm react-markdown
<!-- npm i -D @tailwindcss/typography -->
pnpm add -D @tailwindcss/typography

# set host
"dev": "next dev -H localhost",

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

# ollama connection
OLLAMA_HOST=localhost OLLAMA_ORIGINS=* ollama serve