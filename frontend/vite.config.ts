import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';

function hirelyBackendPlugin(): Plugin {
  return {
    name: 'hirely-backend-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/hirely-core' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const { messages, userProfile, opportunities, selectedOpportunity } = payload;

              const systemInstruction = `You are Hirely Core, the specialized intelligence assistant for the Hirely opportunity platform.
You assist ${userProfile?.name || 'the student'}, who is pursuing ${userProfile?.degree || 'B.Tech'} in ${userProfile?.fieldOfStudy || 'Computer Science'}.
Verified student skills: ${(userProfile?.skills || []).join(', ')}.
Target location: ${userProfile?.location || 'Delhi/NCR, India'}.
Currently indexed live opportunities: ${JSON.stringify(
                (opportunities || []).slice(0, 8).map((o: any) => ({
                  title: o.title,
                  organization: o.organization,
                  location: o.location,
                  match_score: o.match_score,
                  required_skills: o.required_skills,
                  deadline: o.deadlineFormatted,
                  stipend: o.stipendOrAward,
                  workArrangement: o.workArrangement,
                  url: o.url,
                }))
              )}.
Active context opportunity: ${selectedOpportunity ? JSON.stringify({
                title: selectedOpportunity.title,
                organization: selectedOpportunity.organization,
                location: selectedOpportunity.location,
                required_skills: selectedOpportunity.required_skills,
                match_score: selectedOpportunity.match_score,
                stipend: selectedOpportunity.stipendOrAward,
                deadline: selectedOpportunity.deadlineFormatted,
                url: selectedOpportunity.url
              }) : 'None'}.

Instructions:
1. Provide thoughtful, high-signal, accurate advice.
2. Structure your output with clean Markdown: use ## for section headings, **bold** for key concepts and skills, * for bullet points, and numbered lists. Do not leave raw unformatted text.
3. Never fabricate or invent companies, deadlines, compensation, or job listings. If a datum is unverified or unspecified in the listing, clearly state that.
4. If asked to analyze a match, clearly highlight which student skills match, which skills are missing, and suggest actionable preparation steps.
5. If the user provides a resume or job description snippet, extract structured skills and actionable tips.`;

              const lastMessage = messages && messages.length > 0
                ? messages[messages.length - 1].content
                : 'Introduce yourself and summarize my top opportunity matches today.';

              let replyText = '';
              let modelUsed = 'gemini-3.8-flash';
              let isFallback = false;

              const apiKey = process.env.GEMINI_API_KEY;
              if (apiKey) {
                const ai = new GoogleGenAI();
                try {
                  const response = await ai.models.generateContent({
                    model: 'gemini-3.8-flash',
                    contents: lastMessage,
                    config: {
                      systemInstruction,
                      temperature: 0.7,
                    },
                  });
                  replyText = response.text || '';
                  modelUsed = 'gemini-3.8-flash';
                } catch (primaryErr: any) {
                  console.warn(
                    '[Hirely Core] Primary model (gemini-3.8-flash) encountered an issue:',
                    primaryErr?.message || primaryErr,
                    '--> Initiating fallback to secondary model (gemini-3.5-flash-lite)'
                  );
                  try {
                    const fallbackResponse = await ai.models.generateContent({
                      model: 'gemini-3.5-flash-lite',
                      contents: lastMessage,
                      config: {
                        systemInstruction,
                        temperature: 0.7,
                      },
                    });
                    replyText = fallbackResponse.text || '';
                    modelUsed = 'gemini-3.5-flash-lite';
                    isFallback = true;
                  } catch (fallbackErr: any) {
                    console.error('[Hirely Core] Secondary model fallback also failed:', fallbackErr?.message || fallbackErr);
                    throw fallbackErr;
                  }
                }
              } else {
                replyText = 'Hirely Core server requires GEMINI_API_KEY to be configured in environment.';
                isFallback = true;
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ reply: replyText, modelUsed, isFallback }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Hirely Core AI Service Error' }));
            }
          });
          return;
        }

        // Health check endpoint
        if (req.url === '/api/health' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            status: 'healthy',
            gemini_configured: Boolean(process.env.GEMINI_API_KEY),
            primary_model: 'gemini-3.8-flash',
            fallback_model: 'gemini-3.5-flash-lite'
          }));
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), hirelyBackendPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
