from pathlib import Path
import textwrap

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    Table,
    TableStyle,
    KeepTogether,
    Preformatted,
)


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "pdf"
OUT_DIR.mkdir(parents=True, exist_ok=True)
PDF_PATH = OUT_DIR / "ClaimSense_AI_Project_Interview_Preparation_Handbook.pdf"
MD_PATH = OUT_DIR / "ClaimSense_AI_Project_Interview_Preparation_Handbook.md"


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="CoverTitle",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=28,
    leading=34,
    alignment=TA_CENTER,
    textColor=colors.HexColor("#1F2937"),
    spaceAfter=18,
))
styles.add(ParagraphStyle(
    name="H1x",
    parent=styles["Heading1"],
    fontName="Helvetica-Bold",
    fontSize=18,
    leading=23,
    textColor=colors.HexColor("#1F2937"),
    spaceBefore=16,
    spaceAfter=9,
))
styles.add(ParagraphStyle(
    name="H2x",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=13,
    leading=17,
    textColor=colors.HexColor("#334155"),
    spaceBefore=12,
    spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="Bodyx",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=9.2,
    leading=13,
    spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="Smallx",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=8,
    leading=10.5,
    spaceAfter=4,
))
styles.add(ParagraphStyle(
    name="Callout",
    parent=styles["BodyText"],
    fontName="Helvetica-Bold",
    fontSize=9,
    leading=12.5,
    textColor=colors.HexColor("#0F766E"),
    backColor=colors.HexColor("#ECFDF5"),
    borderColor=colors.HexColor("#99F6E4"),
    borderWidth=0.6,
    borderPadding=6,
    spaceBefore=6,
    spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="Mono",
    parent=styles["Code"],
    fontName="Courier",
    fontSize=7.8,
    leading=10,
    textColor=colors.HexColor("#111827"),
    backColor=colors.HexColor("#F8FAFC"),
    borderPadding=5,
))


story = []
md = []


def esc(s):
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def clean(s):
    return textwrap.dedent(str(s)).strip()


def add_md(line=""):
    md.append(line)


def h1(title):
    story.append(Paragraph(esc(title), styles["H1x"]))
    add_md(f"# {title}")


def h2(title):
    story.append(Paragraph(esc(title), styles["H2x"]))
    add_md(f"## {title}")


def p(text):
    text = clean(text)
    for para in text.split("\n\n"):
        story.append(Paragraph(esc(para), styles["Bodyx"]))
        add_md(para)
        add_md("")


def callout(title, text):
    content = f"{title}: {clean(text)}"
    story.append(Paragraph(esc(content), styles["Callout"]))
    add_md(f"> **{title}:** {clean(text)}")
    add_md("")


def code(text):
    text = clean(text)
    story.append(Preformatted(text, styles["Mono"]))
    add_md("```")
    add_md(text)
    add_md("```")
    add_md("")


def bullet(items):
    for item in items:
        story.append(Paragraph("- " + esc(item), styles["Bodyx"]))
        add_md(f"- {item}")
    add_md("")


def table(headers, rows, widths=None, small=False):
    style = styles["Smallx"] if small else styles["Bodyx"]
    data = [[Paragraph(f"<b>{esc(h)}</b>", style) for h in headers]]
    for row in rows:
        data.append([Paragraph(esc(cell), style) for cell in row])
    if widths is None:
        widths = [6.9 * inch / len(headers)] * len(headers)
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#111827")),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t)
    story.append(Spacer(1, 8))
    add_md("| " + " | ".join(headers) + " |")
    add_md("| " + " | ".join(["---"] * len(headers)) + " |")
    for row in rows:
        add_md("| " + " | ".join(cell.replace("\n", " ") for cell in row) + " |")
    add_md("")


def qa_section(question, testing, answer, followup, followup_answer):
    story.append(KeepTogether([
        Paragraph(f"<b>Question:</b> {esc(question)}", styles["Bodyx"]),
        Paragraph(f"<b>What interviewer is testing:</b> {esc(testing)}", styles["Smallx"]),
        Paragraph(f"<b>Strong answer:</b> {esc(answer)}", styles["Smallx"]),
        Paragraph(f"<b>Possible follow-up:</b> {esc(followup)}", styles["Smallx"]),
        Paragraph(f"<b>How to answer:</b> {esc(followup_answer)}", styles["Smallx"]),
        Spacer(1, 6),
    ]))
    add_md(f"**Question:** {question}")
    add_md(f"**What interviewer is testing:** {testing}")
    add_md(f"**Strong answer:** {answer}")
    add_md(f"**Possible follow-up:** {followup}")
    add_md(f"**How to answer the follow-up:** {followup_answer}")
    add_md("")


def concept(name, simple, analogy, technical, project, example, iq, answer):
    h2(name)
    table(
        ["Item", "Explanation"],
        [
            ["Simple definition", simple],
            ["Real-world analogy", analogy],
            ["Technical explanation", technical],
            ["How it is used here", project],
            ["Example", example],
            ["Interview question", iq],
            ["Strong interview answer", answer],
        ],
        widths=[1.65 * inch, 5.25 * inch],
        small=True,
    )


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.drawString(0.62 * inch, 0.38 * inch, "ClaimSense AI Project Interview Preparation Handbook")
    canvas.drawRightString(7.65 * inch, 0.38 * inch, f"Page {doc.page}")
    canvas.restoreState()


# Cover
story.append(Spacer(1, 1.2 * inch))
story.append(Paragraph("ClaimSense AI", styles["CoverTitle"]))
story.append(Paragraph("Project Interview Preparation Handbook", styles["CoverTitle"]))
story.append(Spacer(1, 0.25 * inch))
story.append(Paragraph(
    "A beginner-friendly, interview-focused study guide built from the provided project files.",
    ParagraphStyle(name="CoverSub", parent=styles["Bodyx"], alignment=TA_CENTER, fontSize=12, leading=16),
))
story.append(Spacer(1, 0.4 * inch))
story.append(Paragraph(
    "Prepared for technical interview revision. Generated from the local repository at "
    "C:/Users/LENOVO/Downloads/ClaimSenseAi-main/ClaimSenseAi-main.",
    ParagraphStyle(name="CoverNote", parent=styles["Bodyx"], alignment=TA_CENTER, fontSize=9, leading=13),
))
story.append(PageBreak())
add_md("# ClaimSense AI Project Interview Preparation Handbook")
add_md("A beginner-friendly, interview-focused study guide built from the provided project files.")
add_md("")

h1("Table of Contents")
toc = [
    "Part 1 - Project At A Glance",
    "Part 2 - Explain The Project Like I Am A Beginner",
    "Part 3 - System Architecture",
    "Part 4 - Complete End-To-End Execution",
    "Part 5 - Technologies Used",
    "Part 6 - Core Concepts I Must Understand",
    "Part 7 - Code Walkthrough",
    "Part 8 - Data Flow",
    "Part 9 - Database",
    "Part 10 - AI / Machine Learning Explanation",
    "Part 11 - API Explanation",
    "Part 12 - Why This Technology / Design?",
    "Part 13 - Challenges And Solutions",
    "Part 14 - Limitations",
    "Part 15 - Scalability",
    "Part 16 - Security",
    "Part 17 - Testing And Debugging",
    "Part 18 - Deployment",
    "Part 19 - Interview Question Bank",
    "Part 20 - Cross-Questioning Simulation",
    "Part 21 - HR + Project Questions",
    "Part 22 - 2-Minute Presentation",
    "Part 23 - Rapid Revision Sheet",
    "Part 24 - Flashcards",
    "Part 25 - Final Checklist",
]
bullet(toc)
story.append(PageBreak())

h1("Accuracy Notes")
p("""
This handbook separates project facts from interpretations. A project fact means it is visible in the provided code or documentation. An interpretation means it is a reasonable way to explain or extend the project in an interview, but it is not fully implemented in the provided files.

Important documentation/code mismatch: architecture_overview.md describes semantic search and mentions Gemini 2.0 Flash for ingest plus Gemini 3.0 Flash Preview for retrieval. The actual Supabase functions use google/gemini-2.5-flash through https://ai.gateway.lovable.dev. The actual retrieval ranking in both the browser fallback and Edge Function is keyword/token scoring, not a true embedding/vector search.
""")
callout("Remember This", "In an interview, say the current project behaves like a lightweight RAG assistant. It has retrieval plus grounded generation, but it does not currently implement embeddings or a vector database in the provided code.")

h1("Part 1 - Project At A Glance")
table(
    ["Topic", "Project-specific explanation"],
    [
        ["Project name", "ClaimSense AI, package name claimsense-ai-personal."],
        ["Problem statement", "Insurance trainees need quick, source-backed answers from claim manuals, especially for rules like documentation deadlines, theft requirements, roof settlement rules, and workers' comp reporting."],
        ["Why solve it", "Manuals are long, policy language is precise, and a generic chatbot may invent or generalize rules. This project tries to answer only from indexed manual passages and show citations."],
        ["Proposed solution", "A React web app where a signed-in user asks a question. The system retrieves relevant manual chunks and returns an answer with cited excerpts."],
        ["Main objective", "Help claim trainees ask natural-language questions and receive grounded, verifiable answers from insurance manuals."],
        ["Key features", "Authentication screen, manual repository sidebar, PDF/DOCX upload, retrieval question box, citation cards, follow-up suggestions, local fallback retrieval, dark/light theme, tests for retrieval logic."],
        ["Technologies used", "React, TypeScript, Vite, Tailwind CSS, shadcn/Radix UI components, Supabase Auth/Storage/Postgres/Edge Functions, Deno, Lovable AI gateway, Gemini model, Vitest."],
        ["Input", "A trainee question such as: What documentation is required for a stolen-vehicle comprehensive claim? Optional input: uploaded PDF/DOCX manual."],
        ["Output", "A grounded answer, citation list, page/section metadata, excerpts, and follow-up questions."],
    ],
    widths=[1.65 * inch, 5.25 * inch],
)
h2("Role Of Each Technology")
table(
    ["Technology", "Role in this project"],
    [
        ["React", "Builds the browser interface and updates the page when conversation state changes."],
        ["TypeScript", "Adds type checking for objects like chat turns, citations, manual chunks, and Supabase table rows."],
        ["Vite", "Runs the development server and builds the frontend into static files."],
        ["Tailwind CSS", "Styles the app using utility classes."],
        ["Radix UI / shadcn-style components", "Provides accessible UI primitives such as sheets, toasts, tooltips, buttons, and layout components."],
        ["Supabase Auth", "Handles real user sessions when configured."],
        ["mockAuth", "Provides development/demo login if Supabase is unavailable or not configured."],
        ["Supabase Storage", "Stores uploaded manual files in the manuals bucket."],
        ["Supabase Postgres", "Stores uploaded_manuals and manual_chunks."],
        ["Supabase Edge Functions", "Runs ingest and retrieve backend logic close to Supabase."],
        ["Lovable AI gateway + Gemini", "Chunks uploaded documents and generates final natural-language answers from retrieved passages."],
        ["Vitest", "Tests tokenization, scoring, retrieval, and citation shape."],
    ],
    widths=[2.1 * inch, 4.8 * inch],
    small=True,
)
h2("End-To-End Workflow")
code("""
User signs in
  -> selects or uploads a manual
  -> asks a claim question
  -> frontend validates query length
  -> frontend calls Supabase retrieve function
  -> retrieve loads seed + uploaded chunks
  -> retrieve ranks chunks by token overlap
  -> retrieve sends top chunks + question to Gemini through Lovable gateway
  -> Gemini returns answer + used citation ids + followups
  -> frontend displays answer and CitationCard components
  -> if cloud call fails, browser localRetrieve creates a fallback answer
""")
h2("Project Explanations For Different Time Limits")
table(
    ["Time", "Answer to practice"],
    [
        ["5 minutes", "ClaimSense AI is an insurance training assistant. The user signs in, chooses an indexed manual repository, and asks a claims question in plain English. The React frontend first tries to call a Supabase Edge Function named retrieve. That function combines a seed insurance corpus with uploaded manual chunks from PostgreSQL, scores passages by query-token overlap, selects the top passages, and sends only those passages plus the question to a Gemini model through the Lovable AI gateway. The model is instructed to answer only from the supplied passages and cite them as [#1], [#2], and so on. The frontend displays the answer, citation cards, and follow-up questions. The project also has an ingest Edge Function: uploaded PDF/DOCX files go to Supabase Storage, are parsed or sent to Gemini for chunk extraction, and their chunks are saved in manual_chunks. If Supabase or the function is unavailable, the app falls back to a local retrieval engine built from static chunks in src/data/manuals.ts."],
        ["2 minutes", "ClaimSense AI helps insurance trainees get verified answers from claim manuals. It is a React + TypeScript frontend backed by Supabase. A question is sent to the retrieve function, relevant manual passages are ranked, and Gemini generates a citation-backed answer using only those passages. Uploaded manuals can be stored in Supabase Storage, chunked by the ingest function, and saved in Postgres. A local fallback lets the demo work without the cloud backend."],
        ["1 minute", "ClaimSense AI is a RAG-style insurance manual assistant. Users ask policy questions, the app retrieves relevant manual chunks, and a Gemini model writes a grounded answer with citations. The frontend is React/TypeScript, the backend uses Supabase Edge Functions, Storage, and Postgres, and the project includes local fallback retrieval for demo reliability."],
        ["30 seconds", "ClaimSense AI is a React and Supabase app that answers insurance claim questions from indexed manuals. It retrieves relevant passages, asks Gemini to answer only from those passages, and displays citations so trainees can verify every answer."],
    ],
    widths=[1.05 * inch, 5.85 * inch],
    small=True,
)

h1("Part 2 - Explain The Project Like I Am A Beginner")
p("""
Imagine a new claims trainee has a long stack of insurance manuals on a desk. The trainee asks: What documents do I need for a stolen vehicle claim? A normal chatbot might answer from memory. ClaimSense AI instead opens the relevant manual sections, finds the clauses that mention stolen vehicles and documentation, and then writes an answer while showing exactly which clauses it used.

Running example used throughout this guide: A trainee asks, "What documentation is required to file a stolen-vehicle comprehensive claim?"
""")
h2("Beginner Workflow With One Running Example")
table(
    ["Stage", "Input", "Processing", "Output"],
    [
        ["User input", "Question typed into textarea.", "Frontend trims whitespace and checks max length of 800 characters.", "Clean query string."],
        ["Frontend state", "Clean query.", "Adds a ChatTurn with loading=true so the UI shows a skeleton answer.", "Visible pending question."],
        ["Remote retrieval attempt", "Body: { query: clean query }.", "Calls supabase.functions.invoke('retrieve').", "Either response data or remote error."],
        ["Backend retrieval", "Query plus seed/uploaded chunks.", "Tokenizes query, scores chunks, sorts by score, keeps top 4.", "Relevant passages like auto-2, auto-1, auto-3."],
        ["AI synthesis", "Top passages plus query.", "Gemini is told to answer only from supplied passages and cite [#n].", "Answer, used citation ids, followups."],
        ["Frontend display", "Answer JSON.", "Updates the matching turn, renders markdown bold and citation badges.", "User sees answer and citation cards."],
        ["Fallback", "If remote function fails.", "localRetrieve uses static CHUNKS and rule-based synthesize().", "Demo answer still appears."],
    ],
    widths=[1.25 * inch, 1.55 * inch, 2.45 * inch, 1.65 * inch],
    small=True,
)
h2("Every Major Component")
table(
    ["Component", "What enters", "What it does", "What comes out", "Next stop"],
    [
        ["Auth page", "Email/password or Google click.", "Creates a Supabase session or mock session in development.", "Session object.", "Index page."],
        ["Index page", "Session, selected manual, question.", "Manages conversation state and calls retrieval.", "ChatTurn updates.", "ConversationTurn component."],
        ["ArchiveSidebar", "Manual list, uploaded records, file input.", "Shows repositories, handles manual upload, updates uploaded list.", "Selected manual id or uploaded manual record.", "Index retrieval or ingest function."],
        ["retrieve Edge Function", "HTTP POST JSON query.", "Loads chunks, ranks them, calls Gemini.", "Answer JSON.", "Frontend."],
        ["ingest Edge Function", "storage_path, filename, title.", "Downloads file, extracts DOCX or sends PDF to model, saves chunks.", "manual_id, chunk_count, status.", "Sidebar refresh / database."],
        ["Postgres database", "Uploaded manual metadata and chunks.", "Persists searchable manual content.", "Rows returned to retrieve/sidebar.", "Edge functions/frontend."],
        ["Gemini through Lovable gateway", "Question plus retrieved passages.", "Generates grounded answer or extracts chunks.", "Structured tool-call JSON.", "Edge functions."],
    ],
    widths=[1.35 * inch, 1.25 * inch, 2.1 * inch, 1.2 * inch, 1.0 * inch],
    small=True,
)

h1("Part 3 - System Architecture")
code("""
                         +----------------+
                         |     User       |
                         | Trainee/Admin  |
                         +-------+--------+
                                 |
                                 | browser actions
                                 v
  +------------------------------+------------------------------+
  | React + TypeScript Frontend                                  |
  | Auth page, Index page, Sidebar, ConversationTurn, Citation   |
  +-----------+--------------------------+-----------------------+
              |                          |
              | retrieve question        | upload PDF/DOCX
              v                          v
  +-----------+-----------+   +----------+-----------+
  | Supabase Edge         |   | Supabase Storage     |
  | Function: retrieve    |   | bucket: manuals      |
  +-----------+-----------+   +----------+-----------+
              |                          |
              | read chunks              | storage_path
              v                          v
  +-----------+-----------+   +----------+-----------+
  | Supabase Postgres     |<--| Edge Function: ingest|
  | uploaded_manuals      |   | chunk extraction     |
  | manual_chunks         |   +----------+-----------+
  +-----------+-----------+              |
              |                          | AI call
              | context passages         v
              +-----------------> +------+------+
                                  | Lovable AI  |
                                  | Gateway     |
                                  | Gemini 2.5  |
                                  +------+------+
                                         |
                                         | answer + citations
                                         v
                                  +------+------+
                                  | Frontend UI |
                                  +-------------+
""")
h2("Explain Every Box And Arrow")
table(
    ["Box/Arrow", "Explanation"],
    [
        ["User -> Frontend", "The trainee interacts with the browser: signs in, uploads manuals, selects a repository, asks a question."],
        ["Frontend", "React components hold UI state and convert user actions into Supabase SDK calls."],
        ["Frontend -> retrieve", "A POST-style Edge Function invocation sends the question in JSON."],
        ["retrieve -> Postgres", "The function reads uploaded chunks whose parent manual status is ready."],
        ["retrieve -> Gemini", "The function sends the top passages and query to the AI model through the Lovable gateway."],
        ["Gemini -> retrieve", "Gemini returns structured JSON: answer, used_citation_ids, followups."],
        ["retrieve -> Frontend", "The function returns answer and citation objects to the React app."],
        ["Frontend -> Storage", "Uploaded PDF/DOCX files are saved in a Supabase Storage bucket named manuals."],
        ["Frontend -> ingest", "After upload, frontend invokes ingest with file path and metadata."],
        ["ingest -> Postgres", "The function creates uploaded_manuals and manual_chunks records."],
    ],
    widths=[2.0 * inch, 4.9 * inch],
    small=True,
)
h2("Natural Spoken Architecture Answer")
p("""
"The project is a React and TypeScript web app backed by Supabase. The frontend handles authentication, manual selection, uploads, and the chat interface. For answering a question, the frontend calls a Supabase Edge Function called retrieve. That function gathers built-in sample manual chunks plus any uploaded chunks from Postgres, ranks them against the query, sends the best passages to Gemini through the Lovable AI gateway, and returns an answer with citations. There is also an ingest function for PDF/DOCX uploads: it stores the file in Supabase Storage, extracts or asks Gemini to chunk the manual, and saves those chunks in Postgres. For development reliability, the frontend has mock authentication and local retrieval fallback, so the demo can still work when Supabase is not configured."
""")

h1("Part 4 - Complete End-To-End Execution")
h2("Trace: Stolen Vehicle Documentation Question")
table(
    ["Step", "Component", "Input", "Technical processing", "Output"],
    [
        ["1", "User", "What documentation is required to file a stolen-vehicle comprehensive claim?", "Types the question and presses Retrieve.", "Form submit event."],
        ["2", "Index.tsx", "Form event + input state.", "Prevents default browser form submission, trims text, rejects empty or >800 chars.", "trimmed query."],
        ["3", "Index.tsx", "trimmed query.", "Clears textarea, creates crypto.randomUUID(), appends loading ChatTurn.", "turns includes pending answer."],
        ["4", "Supabase client", "{ query: trimmed }.", "Calls supabase.functions.invoke('retrieve').", "HTTP request to Edge Function."],
        ["5", "retrieve function", "Request JSON.", "Handles OPTIONS, checks LOVABLE_API_KEY, validates query is a string.", "Valid query or error response."],
        ["6", "retrieve function", "Seed chunks + uploaded chunks.", "Tokenizes query and chunks. Counts overlap. Sorts descending. Selects top 4.", "Top chunks, likely auto-2, auto-1, auto-3."],
        ["7", "AI gateway", "System prompt + user prompt + passages.", "Gemini 2.5 Flash is asked to use only passages and return a tool-call object.", "answer, used_citation_ids, followups."],
        ["8", "retrieve function", "AI response.", "Parses tool call JSON and maps used citation ids to citation objects.", "JSON response."],
        ["9", "Index.tsx", "JSON response.", "Updates the matching ChatTurn: loading=false, answer/citations/followups set.", "Renderable chat turn."],
        ["10", "ConversationTurn", "ChatTurn.", "Splits bold syntax and [#n] citations into styled spans and superscript badges.", "Grounded answer UI."],
        ["11", "CitationCard", "Citation objects.", "Displays manual, section, page, heading, excerpt, copy button, expand/collapse.", "Verifiable source cards."],
    ],
    widths=[0.45 * inch, 1.25 * inch, 1.45 * inch, 2.6 * inch, 1.15 * inch],
    small=True,
)
callout("Input -> Processing -> Output", "Input: stolen vehicle claim question. Processing: tokenize, rank, send top passages to Gemini. Output: answer listing police report within 24 hours, title/registration, keys/remotes, SIU cooperation, with citations.")

h1("Part 5 - Technologies Used")
tech_rows = [
    ["React", "A JavaScript library for building UI from reusable components.", "Used for pages/components such as Index, Auth, ArchiveSidebar, ConversationTurn.", "Without it, the app would need another UI framework or manual DOM handling.", "Vue, Angular, Svelte."],
    ["TypeScript", "JavaScript with static types.", "Defines Session, ChatTurn, ManualChunk, Supabase Database types.", "More runtime mistakes could slip through, such as missing citation fields.", "Plain JavaScript, Flow."],
    ["Vite", "A fast frontend dev/build tool.", "Runs dev server on port 8080 and builds dist/.", "Need another bundler to transform TS/React and optimize assets.", "Webpack, Parcel, Next.js."],
    ["Tailwind CSS", "Utility-first CSS framework.", "Most UI styling is className utilities in components.", "Would need handwritten CSS or a component framework's styling system.", "CSS Modules, styled-components, Bootstrap."],
    ["Radix UI/shadcn components", "Accessible UI primitives and locally composed UI components.", "Sheet, toast, tooltip, dialogs, buttons, etc.", "More custom UI behavior and accessibility work.", "Material UI, Chakra UI, Headless UI."],
    ["Supabase", "Backend-as-a-service built on Postgres.", "Auth, Storage, Postgres, Edge Functions.", "Would need custom backend, database, auth, storage hosting.", "Firebase, custom Node/Express backend, Appwrite."],
    ["PostgreSQL", "Relational database.", "Stores uploaded_manuals and manual_chunks.", "Uploaded documents would not persist beyond localStorage/demo.", "MongoDB, MySQL, SQLite."],
    ["Supabase Edge Functions", "Server-side functions deployed near Supabase, written for Deno.", "retrieve and ingest backend logic.", "Secrets and AI calls would have to happen in the browser, which is unsafe.", "Vercel functions, AWS Lambda, Cloudflare Workers."],
    ["Deno", "Runtime used by Supabase Edge Functions.", "Runs TypeScript functions and imports remote/npm modules.", "Need to rewrite functions for Node or another server runtime.", "Node.js, Bun."],
    ["Lovable AI gateway", "Hosted gateway endpoint for model calls.", "Functions call https://ai.gateway.lovable.dev/v1/chat/completions.", "Would call Google Gemini API directly or another provider.", "Google AI Studio API, OpenAI API, Anthropic API."],
    ["Gemini 2.5 Flash", "Fast LLM used in actual code.", "Generates answers and extracts chunks through function/tool calls.", "Only local deterministic responses would be available.", "OpenAI GPT, Claude, Llama."],
    ["mammoth", "DOCX raw-text extractor.", "ingest extracts DOCX text before sending to the AI chunker.", "DOCX uploads would be harder to parse.", "docx4js, libreoffice conversion, custom XML parsing."],
    ["Vitest", "Test runner for Vite projects.", "Tests retrieval utilities and basic setup.", "Less confidence in retrieval behavior.", "Jest, Playwright component tests."],
    ["React Router", "Client-side routing.", "Routes /, /auth, and catch-all NotFound.", "Would need manual location handling or another router.", "TanStack Router, Next.js routing."],
    ["React Query", "Server state library.", "Provider is configured, but current source does not materially use queries/mutations.", "Not much impact in current code; future data fetching could be less organized.", "SWR, direct useEffect calls."],
]
table(["Technology", "What it is", "How used", "If removed", "Alternatives"], tech_rows, widths=[1.05*inch,1.45*inch,1.65*inch,1.45*inch,1.3*inch], small=True)

h1("Part 6 - Core Concepts I Must Understand")
concept("Frontend And Backend", "Frontend is the part users see; backend runs trusted work on a server.", "Restaurant: frontend is the menu and waiter; backend is the kitchen.", "The frontend sends requests; the backend validates, reads data, calls models, and returns responses.", "React is the frontend. Supabase Edge Functions are the backend.", "User asks about theft docs; frontend sends query; backend retrieves passages.", "Why split frontend and backend?", "Because model secrets, database service keys, and heavy processing should stay on the backend, while the frontend focuses on interaction.")
concept("API", "An API is a controlled way for one part of software to talk to another.", "A service counter: you submit a form, the counter returns a result.", "The app invokes Edge Functions using JSON over HTTP-like calls.", "supabase.functions.invoke('retrieve') and invoke('ingest') are API calls.", "Request body: { query: 'stolen vehicle documentation' }.", "What API does your app use?", "The frontend uses Supabase SDK APIs for Auth, Storage, database reads, realtime, and Edge Function calls.")
concept("HTTP And JSON", "HTTP moves requests/responses; JSON is a text format for structured data.", "Courier package: HTTP is delivery, JSON is the labeled content inside.", "Edge Functions return JSON responses with answer/citations or errors.", "retrieve validates req.json() and returns application/json.", "{ answer: '...', citations: [...], followups: [...] }.", "Why JSON?", "JSON is simple, browser-native, and works well between React, Supabase, and Edge Functions.")
concept("Authentication", "Authentication proves who the user is.", "Showing an ID card before entering an office.", "Supabase Auth stores and refreshes sessions. mockAuth simulates a session in development.", "Auth.tsx signs in users; Index.tsx redirects unauthenticated users to /auth.", "Email/password creates Supabase session; demo mode creates localStorage mock session.", "How is login handled?", "Supabase Auth is the main path, with a development-only mock fallback so the app can be demonstrated without cloud config.")
concept("Authorization", "Authorization decides what an authenticated user is allowed to do.", "Having an ID card does not mean you can enter every room.", "RLS policies decide table/storage access. In this project, policies allow anyone to read/insert/update uploaded manuals and read/insert chunks.", "The current project prioritizes demo accessibility over strict access control.", "Anyone can read uploaded_manuals according to the migration.", "Is authorization strong here?", "Not yet. The provided RLS policies are permissive, so production should restrict records by user or organization.")
concept("Database And Tables", "A database stores structured data; tables are organized lists of similar records.", "Spreadsheet tabs with rules and relationships.", "Postgres tables uploaded_manuals and manual_chunks store uploaded document metadata and searchable excerpts.", "manual_chunks.manual_id references uploaded_manuals.id.", "A manual row can have many chunk rows.", "What tables exist?", "uploaded_manuals stores document metadata/status; manual_chunks stores extracted passages linked by manual_id.")
concept("RAG", "Retrieval-Augmented Generation means retrieve facts first, then generate an answer from those facts.", "Open the textbook before answering, instead of guessing from memory.", "A retriever selects relevant chunks; an LLM uses the selected chunks as context.", "The retrieve function ranks chunks and sends the top passages to Gemini.", "Theft query -> auto-2 passage -> Gemini answer with [#1].", "Is this a full RAG system?", "It is RAG-style. The provided code has retrieval plus generation, but retrieval is token scoring rather than embeddings/vector search.")
concept("Tokenization", "Tokenization splits text into searchable pieces.", "Breaking a sentence into index cards.", "tokenize lowercases, removes punctuation except hyphens, splits whitespace, removes stopwords and short tokens.", "Used by score() in local retrieval.", "What documentation is required? -> documentation, required.", "Why tokenize?", "So query words and chunk words can be compared consistently.")
concept("Stopwords", "Stopwords are common words that usually do not help search.", "Ignoring filler words when finding the main topic.", "The project filters words like the, and, what, is, for.", "Improves simple ranking by focusing on meaningful terms.", "what is the coverage for roof -> coverage, roof.", "Why remove stopwords?", "They appear everywhere and can make irrelevant passages look relevant.")
concept("Scoring And Ranking", "Scoring gives each chunk a relevance number; ranking sorts by that number.", "Sorting resumes by how many required skills match the job description.", "local score boosts heading/section matches more than body matches; Edge score uses simpler token overlap.", "Chooses top 4 chunks for answer generation.", "Heading match for theft documentation beats generic text match.", "How do you find relevant passages?", "The current implementation uses token overlap scoring with field boosts in the frontend fallback.")
concept("LLM", "A large language model generates text from a prompt.", "A very skilled writing assistant that needs source material to stay factual.", "Gemini receives instructions, manual passages, and the trainee query.", "Used for chunk extraction in ingest and answer synthesis in retrieve.", "Prompt says use ONLY supplied passages.", "How do you reduce hallucination?", "By limiting context to retrieved passages, instructing the model not to invent facts, and showing citations.")
concept("Prompt", "A prompt is the instruction and input given to the model.", "A work order given to an assistant.", "The retrieve function has a systemPrompt with strict rules and a userPrompt with passages and query.", "Controls answer style, citation behavior, and grounding.", "Cite inline like [#1].", "What is in your prompt?", "Rules for strict retrieval, concise trainee-friendly answer, and no invented forms or page numbers.")
concept("Citations", "Citations show which source supports an answer.", "Footnotes in a textbook.", "The model returns used_citation_ids; the backend maps them to manual, section, page, heading, excerpt.", "Displayed by CitationCard.", "[#1] Part E - Required Documentation for Theft Claims.", "Why citations?", "Insurance rules need verification; citations let trainees check the exact source clause.")
concept("Local Fallback", "Fallback is a backup path used when the preferred path fails.", "If the elevator is down, use stairs.", "Index.tsx first tries retrieve; if unavailable, localRetrieve answers from static CHUNKS and localStorage chunks.", "Makes demos work without Supabase/Gemini.", "Remote error -> console.warn -> localRetrieve.", "Why add fallback?", "It improves reliability for development and interviews, but production should monitor backend failures rather than silently relying on simplified logic.")
concept("Environment Variables And Secrets", "Environment variables configure software without hardcoding values.", "Writing a locker combination on a private note, not on the public door.", "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY configure the frontend. LOVABLE_API_KEY and service role keys are server-side secrets.", "Used by Supabase client and Edge Functions.", ".env.example documents required values.", "Where are secrets stored?", "Frontend gets only public Supabase values; AI and service role keys should be stored as Supabase Edge Function secrets.")
concept("Testing", "Testing checks expected behavior automatically.", "A checklist that runs every time you change the system.", "Vitest runs unit tests for tokenize, score, and localRetrieve.", "Confirms retrieval returns expected answers/citations for sample queries.", "19 tests passed after sandbox-approved run.", "What did you test?", "I tested tokenization, stopword removal, ranking behavior, retrieval results, no-match behavior, and citation shape.")
concept("Build And Deployment", "Build converts source code into production files.", "Packing raw ingredients into a ready-to-ship product.", "Vite builds dist/index.html, CSS, and JS assets.", "Verified npm run build succeeds, with warnings about Browserslist and large chunk size.", "dist/assets/index-DN7ATLi9.js is about 583.52 kB minified.", "How would you deploy it?", "Host the static frontend on Vercel/Netlify/Supabase hosting and deploy Edge Functions plus migrations to Supabase.")

h1("Part 7 - Code Walkthrough")
h2("Entry Point: src/main.tsx")
p("main.tsx is the first frontend file that runs in the browser. It imports ReactDOM's createRoot, imports App, imports global CSS, finds the HTML element with id root, and renders the App component inside it.")
code("""
createRoot(document.getElementById("root")!).render(<App />);
""")
p("The exclamation mark tells TypeScript: I expect root to exist. In an interview, say this is safe because index.html contains the root element; however, a defensive production variant could check for null.")
h2("App.tsx")
p("App.tsx wires the global providers and routes. ThemeProvider controls light/dark mode. QueryClientProvider is ready for React Query server-state usage. TooltipProvider, Toaster, and Sonner provide UI feedback. BrowserRouter defines three routes: /, /auth, and a catch-all NotFound page.")
h2("Index.tsx - The Main Chat Page")
table(
    ["Code area", "What it does", "Interview explanation"],
    [
        ["State variables", "session, authReady, turns, input, activeManual, submitting, sidebarOpen.", "The page state tracks who is logged in, what the user typed, which manual is selected, and what chat turns should render."],
        ["Auth useEffect", "Reads mock session first, then subscribes to Supabase auth changes and redirects unauthenticated users.", "This protects the main page and keeps UI in sync with session changes."],
        ["Auto-scroll useEffect", "Scrolls feed to bottom whenever turns changes.", "Improves chat usability."],
        ["Textarea resize useEffect", "Sets height based on scrollHeight up to 128px.", "Keeps the input comfortable without letting it take over the screen."],
        ["submitQuery", "Validates query, creates loading turn, calls remote retrieve, falls back to localRetrieve, updates turn.", "This is the central user action path."],
        ["clearConversation", "Clears turns array and shows toast.", "Session-level UI reset; not persisted to database."],
    ],
    widths=[1.4*inch,2.65*inch,2.85*inch],
    small=True,
)
h2("Simplified submitQuery")
code("""
async function submitQuery(query) {
  const trimmed = query.trim();
  if (!trimmed || submitting) return;
  if (trimmed.length > 800) showError();

  addLoadingTurn(trimmed);

  try {
    let data = await callSupabaseRetrieve(trimmed);
    if (!data) data = await localRetrieve(trimmed, activeManual);
    updateTurnWithAnswer(data);
  } catch (error) {
    updateTurnWithError(error.message);
  } finally {
    setSubmitting(false);
  }
}
""")
h2("retrieval.ts - Local Retrieval Logic")
table(
    ["Function", "Input", "Processing", "Output"],
    [
        ["tokenize", "Any string.", "Lowercase, remove punctuation except hyphens, split, remove stopwords, keep tokens length > 2.", "Token list."],
        ["score", "Query and ManualChunk.", "Counts matches with boosts: heading/section x3, manual title x1.5, body x1, plus coverage bonus.", "Numeric relevance score."],
        ["loadLocalChunks", "None.", "Reads claimsense_uploaded_chunks from localStorage.", "ManualChunk array or empty array."],
        ["localRetrieve", "query, activeManualId.", "Combines seed + local chunks, optionally filters by manual, ranks, top 4, calls synthesize.", "RetrievalResult."],
        ["synthesize", "query, chunks.", "Uses rule branches for known topics, otherwise stitches retrieved passages.", "answer + followups."],
    ],
    widths=[1.2*inch,1.35*inch,2.45*inch,1.9*inch],
    small=True,
)
h2("retrieve Edge Function")
p("The retrieve function is the production-style backend answer path. It validates the request, loads uploaded chunks from Postgres, ranks chunks, builds context, calls Gemini through Lovable's gateway, parses a tool-call response, maps citation ids to citation objects, and returns JSON.")
code("""
const { query } = await req.json();
if (!query || typeof query !== "string") return 400;

const uploaded = await loadUploadedChunks();
const ALL = [...SEED, ...uploaded];
const top = ALL.map(c => ({ chunk: c, s: score(query, c) }))
  .filter(r => r.s > 0)
  .sort((a, b) => b.s - a.s)
  .slice(0, 4)
  .map(r => r.chunk);
""")
h2("ingest Edge Function")
p("The ingest function supports manual uploads. It inserts a processing record, downloads the uploaded file, extracts DOCX text with mammoth or base64-encodes PDF bytes, asks Gemini to emit structured chunks, inserts those chunks, then marks the manual ready. If anything fails, it marks the manual failed with an error message.")
h2("ArchiveSidebar.tsx")
p("ArchiveSidebar is more than navigation. It lists seed manuals, fetches uploaded manuals from Supabase, subscribes to realtime changes on uploaded_manuals, validates file type and size, uploads files, invokes ingest, and stores a local fallback manual/chunk if cloud ingestion fails.")
h2("ConversationTurn.tsx And CitationCard.tsx")
p("ConversationTurn renders each question/answer pair. It shows a skeleton while loading, an error message on failure, or answer plus citations on success. CitationCard displays source metadata and supports copy plus expand/collapse.")
h2("Error Handling")
bullet([
    "Frontend query validation blocks empty and over-800-character prompts.",
    "Remote retrieve failures are caught and localRetrieve is used as fallback.",
    "Retrieve returns 400 for missing query and 500 for missing secrets or unknown errors.",
    "Ingest marks the uploaded manual as failed if chunking or database insertion fails.",
    "Auth falls back to mock mode if Supabase fetch fails during sign-in.",
])

h1("Part 8 - Data Flow")
code("""
Question text
  -> trim and validate
  -> ChatTurn loading state
  -> retrieve Edge Function
  -> seed chunks + uploaded manual_chunks
  -> tokenization
  -> relevance score
  -> top 4 chunks
  -> prompt context
  -> Gemini response
  -> parsed answer/citations/followups
  -> React state update
  -> ConversationTurn + CitationCard UI
""")
h2("Manual Upload Data Flow")
code("""
PDF/DOCX file
  -> frontend validates extension and 15 MB limit
  -> Supabase Storage bucket manuals
  -> ingest Edge Function receives storage_path
  -> uploaded_manuals row status=processing
  -> file download from storage
  -> DOCX text extraction or PDF base64
  -> Gemini chunk extraction
  -> manual_chunks rows
  -> uploaded_manuals status=ready, chunk_count=N
  -> sidebar refresh/realtime update
""")

h1("Part 9 - Database")
p("Database used: Supabase PostgreSQL. The project also uses Supabase Storage for raw manual files. The provided migrations create two application tables and one storage bucket.")
code("""
uploaded_manuals (one row per uploaded document)
  id UUID primary key
  title text
  code text
  edition text
  source_filename text
  storage_path text
  status text
  error text nullable
  chunk_count integer
  created_at timestamptz

manual_chunks (many rows per uploaded manual)
  id UUID primary key
  manual_id UUID foreign key -> uploaded_manuals.id
  ordinal integer
  section text
  page integer
  heading text
  text text
  created_at timestamptz
""")
h2("Schema Diagram")
code("""
uploaded_manuals
  id PK
  title
  status
  chunk_count
      |
      | one manual has many chunks
      v
manual_chunks
  id PK
  manual_id FK
  section
  page
  heading
  text
""")
h2("Example Records")
table(
    ["Table", "Example record"],
    [
        ["uploaded_manuals", "id=uuid, title='Auto Comprehensive Upload', code='USR', edition='Uploaded', source_filename='auto.pdf', storage_path='1717000000-auto.pdf', status='ready', chunk_count=12."],
        ["manual_chunks", "id=uuid, manual_id=<same manual id>, ordinal=0, section='Part E', page=27, heading='Required Documentation for Theft Claims', text='If your covered auto is stolen...'."],
    ],
    widths=[1.5*inch,5.4*inch],
    small=True,
)
callout("Common Mistake", "Do not claim the project uses a vector database table. The provided migrations do not create embeddings or vector columns.")

h1("Part 10 - AI / Machine Learning Explanation")
p("""
The AI/ML part solves two tasks: first, chunking uploaded manuals during ingest; second, generating final answers during retrieval. The code uses an LLM, not a trained custom machine learning model. There is no training code in the project.
""")
table(
    ["Topic", "Project fact"],
    [
        ["Model problem", "Turn retrieved manual passages into a trainee-friendly answer; extract useful chunks from uploaded manuals."],
        ["Input to model", "For retrieve: top passages + query. For ingest: PDF bytes as base64 or DOCX raw text + chunking instructions."],
        ["Preprocessing", "DOCX is extracted with mammoth; PDF is base64-encoded; query retrieval uses tokenization before model call."],
        ["Model/algorithm", "Actual code calls google/gemini-2.5-flash via Lovable AI gateway."],
        ["Training", "Not present in the provided code/documentation."],
        ["Inference", "The deployed function sends prompts and gets model output at request time."],
        ["Output", "Structured JSON through function/tool calls: answer, used_citation_ids, followups or chunks."],
        ["Evaluation", "No AI quality evaluation suite is present. Vitest covers local retrieval behavior, not model answer quality."],
        ["Limitations", "Model may still produce imperfect answers; grounding depends on retrieved chunks; no embeddings; uploaded PDF extraction relies on model support."],
    ],
    widths=[1.55*inch,5.35*inch],
    small=True,
)
h2("Prompt, Tokens, Context, Hallucination, Grounding")
p("A prompt is the instruction sent to the model. Tokens are pieces of text the model processes. Context is the set of manual passages included with the question. Hallucination means the model invents a plausible but unsupported answer. Grounding means the answer is tied to supplied source passages.")
p("In this project, grounding is attempted by putting only the top passages into the prompt and instructing the model: use ONLY these passages, cite [#n], and never invent forms, sections, or page numbers.")
h2("Embeddings, Vector Databases, RAG")
p("Embeddings are numeric representations of text meaning. A vector database stores those numbers for semantic search. RAG combines retrieval and generation. The documentation describes semantic search, but the actual code does not create embeddings or use a vector database. The actual retrieval is keyword/token overlap.")

h1("Part 11 - API Explanation")
h2("retrieve API")
code("""
Endpoint: Supabase Edge Function named retrieve
Method: POST-style function invocation
Headers: handled by Supabase SDK; function supports CORS
Body:
{
  "query": "What documentation is required to file a stolen-vehicle comprehensive claim?"
}

Response:
{
  "answer": "To file a stolen-vehicle comprehensive claim...",
  "citations": [
    {
      "id": "auto-2",
      "manual": "Auto Comprehensive",
      "section": "Part E - Duties After an Accident or Loss",
      "page": 27,
      "heading": "Required Documentation for Theft Claims",
      "excerpt": "If your covered auto is stolen..."
    }
  ],
  "followups": ["When exactly does rental reimbursement coverage end after a theft?"]
}
""")
h2("ingest API")
code("""
Endpoint: Supabase Edge Function named ingest
Method: POST-style function invocation
Body:
{
  "storage_path": "1717000000-auto.pdf",
  "filename": "auto.pdf",
  "title": "Auto Comprehensive"
}

Response:
{
  "manual_id": "<uuid>",
  "chunk_count": 12,
  "status": "ready"
}
""")
p("GET/PUT/PATCH/DELETE are not directly exposed as custom REST endpoints in this project. Supabase SDK internally uses HTTP methods for database/storage operations, but the project code mainly uses insert, update, select, upload, download, signIn, signUp, and Edge Function invocation.")

h1("Part 12 - Why This Technology / Design?")
decision_rows = [
    ["React + TypeScript", "Chosen for component-based UI and safer types.", "Plain JavaScript or Vue.", "React ecosystem fits Vite, shadcn-style components, Supabase examples, and interview-friendly frontend structure.", "TypeScript adds learning overhead."],
    ["Supabase", "Chosen to avoid building auth, storage, database, realtime, and functions from scratch.", "Custom Express backend + Postgres.", "Faster for a project; Postgres remains production-grade.", "RLS must be configured carefully; vendor dependency."],
    ["Edge Functions", "Keep AI secrets and service-role database access off the browser.", "Call Gemini directly from frontend.", "Frontend secrets would be exposed; backend functions are safer.", "Deno runtime differs from typical Node."],
    ["RAG-style design", "Insurance answers need source grounding.", "Plain chatbot.", "A plain chatbot may hallucinate or miss company manuals.", "Quality depends on retrieval accuracy."],
    ["Keyword scoring now", "Simple, testable, works for small corpus and demo.", "Embeddings/vector search.", "Embeddings would be stronger semantically but require more infrastructure.", "Keyword scoring misses synonyms and deeper meaning."],
    ["Local fallback", "Demo remains usable when Supabase is unavailable.", "Hard fail if backend down.", "Better developer experience and interview demo reliability.", "Fallback behavior may differ from production."],
    ["Citation cards", "Make answers verifiable.", "Show only answer text.", "Interviewers like traceability in high-stakes domains.", "More UI complexity."],
    ["Vitest", "Fast tests that align with Vite.", "Jest.", "Vitest config is simpler in Vite projects.", "Less universal than Jest in older codebases."],
]
table(["Decision", "Why chosen", "Alternative", "Why not alternative", "Tradeoff"], decision_rows, widths=[1.15*inch,1.55*inch,1.3*inch,1.7*inch,1.2*inch], small=True)

h1("Part 13 - Challenges And Solutions")
challenge_rows = [
    ["AI hallucination", "LLMs can invent plausible insurance rules.", "Prompt says use only supplied passages and cite sources.", "Grounding reduces unsupported answers.", "Add automated citation verification."],
    ["Wrong passage retrieval", "Keyword overlap can miss synonyms or rank generic text highly.", "Field boosts and top-4 ranking.", "Simple and testable for small corpus.", "Use embeddings and hybrid search."],
    ["Backend unavailable", "Supabase/Gateway may fail or be unconfigured.", "localRetrieve fallback.", "Keeps demo usable.", "Show degraded-mode banner and retry queue."],
    ["Secrets exposure", "AI keys cannot be shipped to browser.", "Store LOVABLE_API_KEY in Edge Function secrets.", "Backend-only access is safer.", "Use direct provider secret management in another cloud."],
    ["PDF/DOCX complexity", "Documents may have tables, scans, headers, odd formatting.", "DOCX uses mammoth; PDF sent to model as base64.", "Works for many simple manuals.", "Use OCR and robust document parsing pipeline."],
    ["Permissive RLS", "Current policies allow broad access.", "Demo policies prioritize usability.", "Easy setup for training/demo.", "Add user/org ownership policies."],
    ["Large frontend bundle", "Build reports >500 kB chunk.", "Current single bundle still builds successfully.", "Fine for prototype.", "Code split routes and lazy-load UI libraries."],
    ["Duplicate seed corpus", "Seed chunks exist in frontend and retrieve function.", "Kept in sync manually.", "Simple fallback and backend seed behavior.", "Move seed corpus to shared data store."],
    ["No model evaluation", "Generated answers are hard to validate automatically.", "Unit tests cover local retrieval only.", "Tests stable deterministic logic.", "Add golden answer tests and human evals."],
    ["Upload failure after DB insert", "Ingest may fail after creating uploaded_manuals row.", "Catch errors and mark status failed with message.", "User/admin can see failed state.", "Use transactional workflow where possible."],
]
table(["Problem", "Why it happens", "How solved", "Why that solution", "Alternative"], challenge_rows, widths=[1.15*inch,1.35*inch,1.55*inch,1.45*inch,1.4*inch], small=True)
h2("Hardest Part - Interview Answer")
p("Hypothetical but realistic answer: The hardest part was balancing AI flexibility with source accuracy. In insurance, a confident wrong answer is dangerous. I solved this by making retrieval happen before generation, passing only selected passages to the model, requiring citations, and displaying citation cards so the user can verify the source.")
h2("Bug And Debugging - Interview Answer")
p("Hypothetical but realistic answer: One bug I would discuss is retrieval ranking. A generic chunk can match many common words and beat a more relevant section. I debugged this by writing tests around example queries, then boosting heading and section matches so a directly named topic ranks higher than a body-only match.")

h1("Part 14 - Limitations")
bullet([
    "No true semantic embeddings/vector search in the provided code.",
    "Permissive database/storage policies are not production-safe.",
    "Edge Functions have verify_jwt=false in supabase/config.toml.",
    "Seed corpus is duplicated between frontend and backend.",
    "Local fallback is rule-based and may not behave like the remote model.",
    "No persistent chat history table is present.",
    "No user-to-manual ownership model is present.",
    "PDF chunking depends on AI model capability; scanned PDFs may fail or be inaccurate.",
    "No automated AI answer evaluation is present.",
    "Build shows a large chunk warning and stale Browserslist warning.",
])
h2("If I Had More Time")
p("I would add proper user/org authorization, replace keyword-only retrieval with hybrid search using embeddings plus keyword matching, move the seed corpus into the database, add persistent conversation history, add automated evaluation for answer faithfulness, and split the frontend bundle for performance.")

h1("Part 15 - Scalability")
table(
    ["Scale", "What happens", "Likely bottlenecks", "Improvements"],
    [
        ["10 users", "Current design should handle demo usage easily.", "Mostly none except API secrets/config.", "Keep logs and monitor errors."],
        ["1,000 users", "Edge Functions and Supabase can handle moderate traffic, but AI gateway cost/latency matters.", "LLM latency, repeated same queries, database scans.", "Add caching, indexes, rate limits, query logs."],
        ["100,000 users", "Need production architecture work.", "AI cost, concurrency, database load, upload processing, security boundaries.", "Queues for ingest, worker pipeline, org-based sharding, CDN, caching, observability."],
        ["1 million users", "Requires serious distributed design.", "Global latency, tenant isolation, vector index size, cost controls, abuse prevention.", "Load balancing, multi-region deployment, managed vector DB/hybrid search, autoscaling workers, billing/rate policy."],
    ],
    widths=[1.0*inch,1.9*inch,1.8*inch,2.2*inch],
    small=True,
)

h1("Part 16 - Security")
security_rows = [
    ["Authentication", "Supabase Auth and Google OAuth path exist; mockAuth exists only in development.", "Disable/mockAuth guard in production and require real sessions."],
    ["Authorization", "RLS policies currently allow anyone to read/insert/update certain tables.", "Add user_id/org_id columns and restrict each tenant's data."],
    ["Input validation", "Query max length 800; uploads allow only PDF/DOCX and max 15 MB in frontend and PDF path.", "Also validate MIME/content server-side."],
    ["SQL injection", "Supabase query builder reduces manual SQL injection risk.", "Still validate data and avoid raw SQL for user input."],
    ["API security", "verify_jwt=false for ingest/retrieve.", "Require JWT for production functions unless intentionally public."],
    ["Secrets", "LOVABLE_API_KEY and service role keys are backend secrets.", "Never put them in VITE_ variables or frontend code."],
    ["Data privacy", "Uploaded manuals may be proprietary.", "Use private bucket, strict RLS, encryption, audit logs."],
    ["HTTPS", "Supabase and hosted frontend should use HTTPS.", "Required for secure auth and clipboard/browser APIs."],
    ["Access control", "Manual ownership is not present.", "Add ownership model before production."],
]
table(["Area", "How it applies", "Interview-safe improvement"], security_rows, widths=[1.35*inch,2.85*inch,2.7*inch], small=True)

h1("Part 17 - Testing And Debugging")
p("Verified checks: npm test passed with 2 test files and 19 tests. npm run build passed. The build reported a stale Browserslist data warning and a chunk-size warning for a 583.52 kB minified JS file.")
table(
    ["Test Case", "Input", "Expected Output", "Possible Failure"],
    [
        ["Tokenize simple query", "Roof Settlement", "roof, settlement", "Case or punctuation not normalized."],
        ["Stopwords", "what is the coverage for the roof", "coverage, roof only important tokens", "Common words inflate scores."],
        ["Roof ranking", "roof depreciation windstorm hail", "pc-2 ranks highest", "Wrong policy chunk selected."],
        ["Auto theft retrieval", "stolen vehicle documentation theft claim", "Answer mentions police report and auto-2 citation", "Missing theft duties."],
        ["Workers comp retrieval", "first report injury deadline", "Answer includes 7 days and wc-1", "Wrong manual chosen."],
        ["No match", "deep sea fishing regulations", "No matching passages message", "Fabricated answer."],
        ["Upload invalid file", "notes.txt", "Only PDF/DOCX error", "Unsupported file accepted."],
        ["Oversize upload", ">15 MB file", "File exceeds 15 MB error", "Large upload overloads ingest."],
        ["Missing secret", "retrieve without LOVABLE_API_KEY", "500 missing secret error", "Unclear backend failure."],
        ["Auth redirect", "No session", "Navigate to /auth", "Protected page visible."],
    ],
    widths=[1.55*inch,1.55*inch,2.05*inch,1.75*inch],
    small=True,
)
h2("Debugging Approach")
bullet([
    "Reproduce with a concrete query from the starter prompts.",
    "Check browser console for remote Edge Function fallback warnings.",
    "Inspect network/function response JSON.",
    "Use tests to isolate tokenize/score/localRetrieve behavior.",
    "Check Supabase table status for uploaded_manuals: processing, ready, failed.",
    "Check Edge Function logs for missing secrets, AI gateway errors, and chunk parsing errors.",
])

h1("Part 18 - Deployment")
code("""
Developer machine
  -> npm install
  -> configure .env for Supabase public values
  -> run tests and build
  -> commit to Git/GitHub
  -> create Supabase project
  -> apply migrations
  -> create/set Edge Function secrets
  -> deploy ingest and retrieve functions
  -> deploy frontend dist to Vercel/Netlify/Supabase hosting
  -> users access production URL over HTTPS
""")
p("Docker is not present in the provided project. A possible future deployment could use Docker for a custom backend, but this project as provided is better described as a static Vite frontend plus Supabase backend services.")

h1("Part 19 - Interview Question Bank")
def answer_for(q, theme):
    ql = q.lower()
    if "problem" in ql:
        return "ClaimSense AI solves the problem of finding precise insurance claim rules inside long manuals. It retrieves relevant passages and generates an answer with citations instead of relying on unsupported model memory."
    if "target user" in ql:
        return "The primary user is an insurance claims trainee or adjuster who needs to quickly understand eligibility rules, documentation duties, deadlines, and exceptions from manuals."
    if "input and output" in ql:
        return "The main input is a natural-language claim question, and the output is an answer, citation objects, source excerpts, page/section metadata, and follow-up questions."
    if "citation" in ql:
        return "A citation is a link between a statement in the answer and a retrieved manual passage. In the UI it appears as [#n] and is expanded in CitationCard with manual, section, page, heading, and excerpt."
    if "manual chunk" in ql or "chunk" in ql:
        return "A manual chunk is a small self-contained passage from a manual. The app searches chunks instead of whole documents because smaller passages are easier to rank, cite, and fit into an LLM context."
    if "login" in ql or "authentication" in ql:
        return "Login is handled by Supabase Auth when configured. In development, mockAuth can create a localStorage demo session so the app remains usable without cloud setup."
    if "react" in ql:
        return "React is used to build the interactive browser UI from components such as Auth, Index, ArchiveSidebar, ConversationTurn, and CitationCard."
    if "supabase" in ql:
        return "Supabase provides Auth, Storage, Postgres, realtime subscriptions, and Edge Functions. It lets the project have a backend without writing a separate always-on server."
    if "local fallback" in ql or "backend is down" in ql or "supabase is not configured" in ql:
        return "The app first tries the remote retrieve function. If that fails, Index.tsx catches the error and calls localRetrieve, which searches static chunks plus localStorage chunks and returns a deterministic answer."
    if "localretrieve" in ql or "rank" in ql or "scoring" in ql or "find relevant" in ql:
        return "localRetrieve combines built-in chunks and local uploaded chunks, optionally filters by active manual, scores each chunk, sorts by score, and uses the top four chunks to build a response."
    if "heading" in ql:
        return "Heading and section terms are boosted because they usually name the actual topic. This prevents a generic body-text match from beating a passage whose heading directly says theft documentation or roof settlement."
    if "retrieve function" in ql:
        return "The retrieve Edge Function validates the query, loads seed and uploaded chunks, ranks passages, builds model context, calls Gemini 2.5 Flash through the Lovable gateway, parses structured output, and returns answer/citations/followups."
    if "ingest" in ql or "upload" in ql or "pdf" in ql or "docx" in ql:
        return "Upload starts in ArchiveSidebar. The file is validated, uploaded to Supabase Storage, and sent to the ingest function. ingest creates a processing record, extracts chunks using mammoth or Gemini, stores manual_chunks, and marks the manual ready."
    if "database" in ql or "tables" in ql or "relationship" in ql:
        return "The database has uploaded_manuals for document metadata/status and manual_chunks for extracted passages. manual_chunks.manual_id is a foreign key to uploaded_manuals.id, so one manual can have many chunks."
    if "rls" in ql or "tenant" in ql or "user sees another" in ql or "authorization" in ql:
        return "The provided RLS policies are permissive, so production should add user_id or organization_id columns, private storage, and policies that restrict each user to their own manuals."
    if "model" in ql or "gemini" in ql:
        return "The actual code calls google/gemini-2.5-flash through the Lovable AI gateway. It uses the model for answer synthesis in retrieve and chunk extraction in ingest."
    if "documentation mention" in ql or "contradiction" in ql or "semantic search" in ql or "embedding" in ql or "vector" in ql:
        return "The documentation describes semantic search and other Gemini versions, but the actual code uses Gemini 2.5 Flash and token-overlap retrieval. I would be honest and call embeddings/vector search a future improvement, not a current feature."
    if "hallucination" in ql or "gemini is wrong" in ql or "page number" in ql:
        return "The project reduces hallucination by retrieving passages first, prompting the model to use only those passages, and showing citations. A stronger production version should verify citations and reject unsupported claims."
    if "scale" in ql or "many users" in ql or "concurrent" in ql:
        return "At higher scale, bottlenecks are AI latency/cost, database scans, upload processing, and authorization. I would add caching, queues, better indexes, rate limits, observability, and eventually hybrid search infrastructure."
    if "security" in ql or "api key" in ql or "malicious" in ql or "confidential" in ql or "verify_jwt" in ql:
        return "The main security improvements are authenticated Edge Functions, private storage, strict RLS, server-side MIME validation, audit logs, rate limits, and keeping AI/service keys only in backend secrets."
    if "test" in ql or "vitest" in ql:
        return "Vitest tests tokenization, stopword removal, ranking, localRetrieve outputs, no-match behavior, manual filtering fallback, and citation shape. In my run, 19 tests passed."
    if "build" in ql or "chunk" in ql or "bundle" in ql:
        return "The production build passed. It warned that Browserslist data is stale and that one JavaScript chunk is larger than 500 kB, so code splitting would be a future performance improvement."
    if "prompt" in ql:
        return "The retrieve prompt contains strict instructions: answer only from supplied manual passages, cite with [#n], be concise, and never invent forms, sections, or page numbers."
    if "why not use chatgpt" in ql or "normal chatbot" in ql:
        return "A normal chatbot answers from general model knowledge, which may be outdated or unsupported. ClaimSense retrieves company/manual-specific passages first, then generates a grounded answer with citations."
    if "why not java" in ql:
        return "Java could work for the backend, but this project is frontend-heavy and Supabase Edge Functions run TypeScript/Deno naturally. React + TypeScript keeps the main stack consistent."
    if "firebase" in ql:
        return "Firebase is a valid alternative, but Supabase gives a relational Postgres database, SQL migrations, storage, auth, realtime, and functions, which fit structured manual/chunk metadata well."
    if "contribution" in ql or "personally" in ql:
        return "Do not invent this. State your real contribution. If your role was study/maintenance, say you analyzed the architecture, traced the data flow, verified tests/build, and can explain limitations and improvements."
    if "what is not present" in ql:
        return "Not present in the provided code: embeddings, vector database, Docker, persistent chat history, strict tenant authorization, custom model training, and automated LLM faithfulness evaluation."
    if "improve" in ql or "future" in ql:
        return "My first improvements would be stricter security, hybrid retrieval with embeddings, persistent conversation history, automated answer evaluation, better document parsing, and bundle code splitting."
    return "I would answer by tracing the exact project flow: React UI receives the action, Supabase handles backend/database/storage work, retrieval selects passages, Gemini generates grounded text, and the UI displays citations. I would also clearly state any missing production features."


def followup_for(q):
    ql = q.lower()
    if "embedding" in ql or "semantic" in ql or "vector" in ql:
        return ("How exactly would you add embeddings?", "Create embeddings for each chunk during ingest, store them in pgvector or a vector DB, embed the query at retrieval time, and combine semantic similarity with keyword scoring.")
    if "security" in ql or "rls" in ql or "verify_jwt" in ql or "tenant" in ql:
        return ("What is the first production security fix?", "Require authenticated Edge Functions and change RLS so manuals/chunks are scoped to a user or organization.")
    if "retrieve" in ql or "localretrieve" in ql or "rank" in ql:
        return ("What happens if the top chunk is wrong?", "The answer may be grounded in the wrong source, so I would improve ranking, add hybrid search, and evaluate retrieval precision.")
    if "ingest" in ql or "upload" in ql or "pdf" in ql or "docx" in ql:
        return ("What happens if chunking fails?", "The ingest function catches the error, updates uploaded_manuals.status to failed, stores the error message, and returns an error response.")
    if "test" in ql or "build" in ql:
        return ("What is not tested yet?", "Remote Edge Functions, Supabase integration, upload processing, auth flows, UI behavior, and LLM answer faithfulness need additional tests.")
    return ("Can you connect that answer to the actual code?", "Name the specific file, function, or table, then separate what exists now from what you would improve later.")


def make_questions(prefix, count, theme):
    items = []
    for i in range(1, count + 1):
        if theme == "beginner":
            q = [
                "What problem does ClaimSense AI solve?",
                "Who is the target user?",
                "What is the input and output?",
                "What is a citation in this app?",
                "What is a manual chunk?",
                "Why does the app need login?",
                "What is React used for?",
                "What is Supabase used for?",
                "What happens when the user asks a question?",
                "What is the local fallback?",
                "What is the main page of the app?",
                "What is the Auth page?",
                "Why is TypeScript useful?",
                "What is Vite?",
                "What does the sidebar show?",
                "What does the Retrieve button do?",
                "What is a starter prompt?",
                "What is a follow-up question?",
                "What is localStorage used for?",
                "What tests are present?",
            ][i-1]
            ans = answer_for(q, theme)
        elif theme == "intermediate":
            q = [
                "Explain the submitQuery flow.",
                "How does localRetrieve rank chunks?",
                "Why are heading matches boosted?",
                "How does the retrieve function build context?",
                "How does the app handle failed remote retrieval?",
                "How are uploaded manuals shown in the sidebar?",
                "How does the ingest function process DOCX?",
                "How does the ingest function process PDF?",
                "What database relationship exists?",
                "What is RLS and how is it configured here?",
                "What is the role of Supabase Storage?",
                "How are citations rendered?",
                "What does renderAnswer do?",
                "How is authentication state tracked?",
                "Why use Edge Functions for AI calls?",
                "What is the difference between seed chunks and uploaded chunks?",
                "What does the no-match path return?",
                "What build warnings appeared?",
                "How would you debug a wrong citation?",
                "What is the role of Vitest?",
                "Why is query length limited?",
                "How does realtime update sidebar data?",
                "What is the purpose of types.ts?",
                "How does error handling work in ingest?",
                "What does verify_jwt=false mean?",
            ][i-1]
            ans = answer_for(q, theme)
        elif theme == "advanced":
            q = [
                "Is this true semantic search?",
                "How would you add embeddings?",
                "How would you prevent hallucination more strongly?",
                "How would you secure tenant data?",
                "How would you scale ingest?",
                "How would you evaluate answer faithfulness?",
                "How would you handle scanned PDFs?",
                "How would you reduce AI cost?",
                "How would you design caching?",
                "How would you handle model timeouts?",
                "How would you version manuals?",
                "How would you avoid duplicated seed data?",
                "How would you improve chunking quality?",
                "How would you improve prompt safety?",
                "How would you make retrieval hybrid?",
                "How would you add observability?",
                "How would you prevent prompt injection in manuals?",
                "How would you add audit trails?",
                "How would you handle organization roles?",
                "How would you code split the app?",
                "How would you harden Edge Functions?",
                "How would you test Edge Functions?",
                "How would you handle concurrent uploads?",
                "How would you migrate from demo to production?",
                "How would you measure retrieval precision?",
            ][i-1]
            ans = answer_for(q, theme)
        elif theme == "project":
            project_qs = [
                "What is in src/data/manuals.ts?",
                "What is in src/utils/retrieval.ts?",
                "What is STARTER_PROMPTS?",
                "What does MAX_CHARS do?",
                "What does activeManual control?",
                "What is the role of ArchiveSidebar?",
                "What happens in onFile?",
                "What tables are created by the migration?",
                "What does manual_chunks_manual_id_idx optimize?",
                "What is the seed corpus?",
                "What model is actually used in code?",
                "What model does documentation mention?",
                "What is the contradiction in the docs?",
                "What does synthesize do?",
                "What are the known answer branches?",
                "What happens for an unrelated query?",
                "What does mockAuth do?",
                "What is the Lovable integration?",
                "How does Google sign-in happen?",
                "What does CitationCard copy?",
                "What does uploaded_manuals.status mean?",
                "How does the function load uploaded chunks?",
                "Why does retrieve need a service role key?",
                "What is the PDF size limit?",
                "What does mammoth do?",
                "What does the tool-call schema enforce?",
                "What is a ChatTurn?",
                "What did npm test verify?",
                "What did npm build produce?",
                "What is not present in the project?",
            ]
            q = project_qs[i-1]
            ans = answer_for(q, theme)
        elif theme == "scenario":
            scenarios = [
                "The retrieve function returns 500. What do you check?",
                "The answer has no citations. What do you check?",
                "A PDF upload fails. What do you check?",
                "A user sees another user's manuals. What is wrong?",
                "Search misses a synonym. What improvement would you make?",
                "The model invents a page number. How do you respond?",
                "The app works locally but not production. What do you check?",
                "Build chunk is too large. What do you do?",
                "Supabase is not configured. What happens?",
                "Local fallback gives different answer than cloud. How explain?",
                "An uploaded manual stays processing forever. What do you check?",
                "A DOCX has no extractable text. What happens?",
                "Gateway rate limits requests. What do you do?",
                "User uploads confidential documents. What must change?",
                "Question is over 800 characters. What happens?",
                "Realtime updates do not appear. What do you check?",
                "Citation copy button fails. Is app broken?",
                "The user asks an out-of-scope question. What should happen?",
                "A new manual type is needed. How add it?",
                "A strict interviewer asks why no vector DB. What say?",
            ]
            q = scenarios[i-1]
            ans = answer_for(q, theme)
        else:
            followups = [
                "Why not use ChatGPT directly?",
                "Why not Java?",
                "Why not Firebase?",
                "Why Supabase instead of custom backend?",
                "What if Gemini is wrong?",
                "What if retrieval is wrong?",
                "What if policies change?",
                "What if a manual is huge?",
                "What if many users upload files?",
                "What if someone uploads malicious content?",
                "What if the API key leaks?",
                "What if database goes down?",
                "What if user has no internet?",
                "What if citations do not match answer?",
                "What if a claim rule is state-specific?",
                "What if the interviewer asks for architecture?",
                "What if asked about your contribution?",
                "What if asked about limitations?",
                "What if asked about future work?",
                "What if asked to explain to non-technical person?",
            ]
            q = followups[i-1]
            ans = answer_for(q, theme)
        items.append((q, ans))
    return items

sections = [
    ("Beginner", make_questions("B", 20, "beginner")),
    ("Intermediate", make_questions("I", 25, "intermediate")),
    ("Advanced", make_questions("A", 25, "advanced")),
    ("Project-specific", make_questions("P", 30, "project")),
    ("Scenario-based", make_questions("S", 20, "scenario")),
    ("Follow-up / Cross-questioning", make_questions("F", 20, "followup")),
]
for section_name, items in sections:
    h2(section_name)
    for q, ans in items:
        fu, fua = followup_for(q)
        qa_section(
            q,
            "Whether you understand the project beyond memorized buzzwords.",
            ans,
            fu,
            fua,
        )

h1("Part 20 - Project Cross-Questioning Simulation")
dialogue = [
    ("Interviewer", "Tell me about your project."),
    ("Candidate", "One of my projects is ClaimSense AI, an insurance training assistant that answers claim-manual questions with citations. A trainee asks a question, the app retrieves relevant manual passages, and Gemini generates an answer using only those passages."),
    ("Interviewer", "Why not just use a normal chatbot?"),
    ("Candidate", "Because insurance policy answers must be tied to exact clauses. A normal chatbot can give plausible but unsupported answers. Here, the value is retrieval and citations."),
    ("Interviewer", "Is it using embeddings?"),
    ("Candidate", "The architecture document describes semantic search, but the provided code currently uses token-based scoring. I would call it RAG-style today and say embeddings are a planned production improvement."),
    ("Interviewer", "Walk me through one request."),
    ("Candidate", "The user submits a query in Index.tsx. The frontend validates it, adds a loading chat turn, invokes the retrieve Edge Function, receives answer/citations/followups, and renders them through ConversationTurn and CitationCard."),
    ("Interviewer", "What happens inside retrieve?"),
    ("Candidate", "It validates the query, loads seed and uploaded chunks, scores chunks by token overlap, keeps top four, builds a prompt, calls Gemini 2.5 Flash through the Lovable gateway, parses the tool-call JSON, and returns answer JSON."),
    ("Interviewer", "What if the backend is down?"),
    ("Candidate", "The frontend catches the remote failure and falls back to localRetrieve, which uses static manual chunks and deterministic synthesis branches."),
    ("Interviewer", "How do uploads work?"),
    ("Candidate", "ArchiveSidebar validates PDF/DOCX and size, uploads to Supabase Storage, then invokes ingest. ingest stores a processing record, downloads the file, extracts chunks using mammoth for DOCX or model-based PDF processing, inserts manual_chunks, and marks the manual ready."),
    ("Interviewer", "What tables are used?"),
    ("Candidate", "uploaded_manuals for document metadata and status, and manual_chunks for extracted passages. manual_chunks.manual_id is a foreign key to uploaded_manuals.id."),
    ("Interviewer", "What is weak in the current security?"),
    ("Candidate", "RLS policies are permissive and the functions have verify_jwt=false. That is acceptable for a demo but not production. I would add user/org ownership, private storage, and authenticated functions."),
    ("Interviewer", "What did you test?"),
    ("Candidate", "Vitest covers tokenization, stopword filtering, ranking examples, localRetrieve answers, no-match behavior, active manual behavior, and citation shape. The suite passed 19 tests."),
    ("Interviewer", "What would you improve first?"),
    ("Candidate", "I would first harden security and then improve retrieval using hybrid search with embeddings plus keyword matching, because both accuracy and data privacy matter in insurance."),
]
for speaker, text in dialogue:
    story.append(Paragraph(f"<b>{speaker}:</b> {esc(text)}", styles["Bodyx"]))
    add_md(f"**{speaker}:** {text}")
add_md("")

h1("Part 21 - HR + Project Questions")
hr_answers = [
    ("Tell me about your project.", "ClaimSense AI is a web app for insurance trainees. It lets them ask natural-language questions about claim manuals and returns source-backed answers with citations."),
    ("Why did you choose this project?", "I chose it because insurance claim handling is detail-heavy, and mistakes can be costly. It is a good use case for retrieval-grounded AI rather than a generic chatbot."),
    ("What was your contribution?", "A safe answer is: I studied and can explain the frontend flow, retrieval logic, Supabase backend, database schema, and testing approach. If you personally implemented parts, name only those parts truthfully."),
    ("What did you personally implement?", "Not specified in the project files. Prepare your real contribution. Example if true: I implemented the retrieval utility, citation UI, and Supabase function integration."),
    ("What was the biggest challenge?", "Keeping answers grounded. The project reduces risk by retrieving passages first and requiring citations."),
    ("What did you learn?", "I learned how a React frontend, Supabase backend, and LLM prompting can work together in a RAG-style application."),
    ("What would you improve?", "I would add secure authorization, embeddings/hybrid retrieval, persistent chat history, and answer quality evaluation."),
    ("What happens if the system fails?", "Remote failure falls back to local retrieval in the frontend. In production I would also add monitoring, retries, and visible degraded-mode messaging."),
    ("Why should we believe you understand it?", "I can trace a request from textarea to Edge Function to database/model and back to the citation UI, and I can also explain current limitations honestly."),
    ("Explain it to a non-technical person.", "It is like a smart assistant that reads the company claim manuals before answering, then shows the exact manual section it used so the trainee can verify it."),
]
for q, a in hr_answers:
    story.append(Paragraph(f"<b>{esc(q)}</b>", styles["Bodyx"]))
    story.append(Paragraph(esc(a), styles["Smallx"]))
    add_md(f"**{q}**")
    add_md(a)
    add_md("")

h1("Part 22 - 2-Minute Project Presentation")
p("""
One of my projects is ClaimSense AI, an insurance training assistant for answering claim-manual questions with citations. The problem is that insurance manuals are long and precise, and a generic chatbot can easily give a confident but unsupported answer. ClaimSense solves this by using a RAG-style workflow: first retrieve relevant manual passages, then generate an answer only from those passages.

The frontend is built with React, TypeScript, Vite, Tailwind CSS, and reusable UI components. The backend uses Supabase for authentication, storage, PostgreSQL, realtime updates, and Edge Functions. When a trainee asks a question, the React app sends it to the retrieve Edge Function. The function ranks manual chunks, sends the top passages to Gemini through the Lovable AI gateway, and returns an answer with citations. Uploaded manuals go through the ingest function, which stores the file, extracts chunks, and saves them in the database.

The most important technical decision was grounding the answer in citations, because claim handling requires accuracy and traceability. The biggest limitation is that the current code uses token-based retrieval rather than true embeddings, so a production version should add hybrid search, stricter authorization, and automated faithfulness evaluation.
""")

h1("Part 23 - Rapid Revision Sheet")
bullet([
    "Objective: answer insurance claim-manual questions with source citations.",
    "Frontend: React + TypeScript + Vite + Tailwind.",
    "Backend: Supabase Auth, Storage, Postgres, Edge Functions.",
    "AI: actual code uses Gemini 2.5 Flash through Lovable AI gateway.",
    "Main pages: Auth.tsx and Index.tsx.",
    "Main components: ArchiveSidebar, ConversationTurn, CitationCard, ErrorBoundary.",
    "Main utilities: mockAuth and localRetrieve.",
    "Database: uploaded_manuals and manual_chunks.",
    "Retrieval: tokenization + scoring + top 4 chunks.",
    "RAG status: RAG-style; no embeddings/vector DB in provided code.",
    "Upload: PDF/DOCX -> Storage -> ingest -> chunks -> Postgres.",
    "Answer: query -> retrieve -> Gemini -> citations -> UI.",
    "Security gap: permissive RLS and verify_jwt=false.",
    "Testing: 19 Vitest tests passed.",
    "Build: passed, with stale Browserslist and large chunk warnings.",
    "Top improvements: secure RLS, embeddings, persistent chat, evals, code splitting.",
])
h2("20 Most Likely Questions")
likely = [
    "Tell me about ClaimSense AI.",
    "Why is RAG useful here?",
    "Is this true semantic search?",
    "Walk through one request.",
    "What happens if Supabase fails?",
    "How are citations generated?",
    "What is a manual chunk?",
    "How are uploaded manuals processed?",
    "What database tables are used?",
    "How does authentication work?",
    "What are the security limitations?",
    "Why use Supabase?",
    "Why use TypeScript?",
    "What did you test?",
    "What would you improve?",
    "How would you scale it?",
    "How would you add embeddings?",
    "How would you prevent hallucination?",
    "What build warnings exist?",
    "What is not present in the project?",
]
bullet(likely)

h1("Part 24 - Flashcards")
flashcards = []
base_cards = [
    ("What is ClaimSense AI?", "A web app that answers insurance claim-manual questions with citations.", "It is the main project."),
    ("What is RAG?", "Retrieval-Augmented Generation: retrieve sources first, then generate an answer.", "The project retrieves manual chunks before Gemini answers."),
    ("What is React?", "A library for building user interfaces.", "Used for Auth, Index, sidebar, and answer UI."),
    ("What is TypeScript?", "JavaScript with types.", "Used to define manual chunks, citations, chat turns, and database rows."),
    ("What is Vite?", "A fast frontend build tool.", "Runs and builds the React app."),
    ("What is Supabase?", "A backend platform with database, auth, storage, and functions.", "Provides most backend services."),
    ("What is Postgres?", "A relational database.", "Stores uploaded manuals and manual chunks."),
    ("What is Supabase Storage?", "File storage service.", "Stores uploaded PDF/DOCX manuals."),
    ("What is an Edge Function?", "Server-side function deployed on Supabase.", "retrieve and ingest run there."),
    ("What is Gemini?", "An LLM from Google.", "Used through Lovable gateway for generation and chunking."),
    ("What is tokenization?", "Splitting text into useful words.", "Used by retrieval.ts scoring."),
    ("What are stopwords?", "Common words removed from search.", "Words like the, and, what are filtered."),
    ("What is a chunk?", "A smaller passage of a document.", "Manuals are searched as chunks."),
    ("What is a citation?", "A reference to source material.", "CitationCard shows section, page, heading, excerpt."),
    ("What is localRetrieve?", "Browser fallback retrieval function.", "Answers from static and localStorage chunks."),
    ("What is synthesize?", "Function that builds local fallback answers.", "Has branches for roof, theft, power, WC, etc."),
    ("What is mockAuth?", "Development-only fake session helper.", "Allows demo login without Supabase."),
    ("What is RLS?", "Row Level Security.", "Configured permissively in the migration."),
    ("What is verify_jwt=false?", "Function does not require a valid JWT.", "Current config uses it for ingest and retrieve."),
    ("What is mammoth?", "DOCX text extraction library.", "Used in ingest for DOCX files."),
    ("What does Index.tsx do?", "It is the main chat page.", "It manages session checks, input, turns, retrieval calls, and display state."),
    ("What does Auth.tsx do?", "It handles sign-in and sign-up UI.", "It uses Supabase Auth, Lovable OAuth, and mockAuth fallback."),
    ("What does ArchiveSidebar do?", "It shows manuals and handles uploads.", "It validates files, uploads to Storage, invokes ingest, and listens for realtime updates."),
    ("What does ConversationTurn do?", "It renders one question-answer pair.", "It shows loading skeleton, error, answer, and citations."),
    ("What does CitationCard do?", "It displays a source excerpt.", "It shows manual, section, page, heading, and copy/expand controls."),
    ("What is uploaded_manuals?", "A database table for uploaded document metadata.", "It tracks title, file path, status, error, and chunk count."),
    ("What is manual_chunks?", "A database table for extracted passages.", "retrieve reads ready chunks from this table."),
    ("What is SUPABASE_SERVICE_ROLE_KEY?", "A powerful backend database key.", "Edge Functions use it to read/write data; it must never be exposed to the browser."),
    ("What is LOVABLE_API_KEY?", "A backend secret for AI gateway access.", "retrieve and ingest need it to call the model."),
    ("What does verify_jwt=false mean?", "The function does not require a signed-in user's JWT.", "It is convenient for demos but should be changed for production."),
    ("What is the 800 character limit?", "A frontend query-size guard.", "Index.tsx rejects prompts longer than MAX_CHARS."),
    ("What is the 15 MB limit?", "An upload-size guard.", "ArchiveSidebar blocks files over 15 MB; ingest also checks PDF bytes."),
    ("What is a no-match response?", "A safe answer when no relevant passages are found.", "localRetrieve and retrieve avoid fabricating unsupported answers."),
    ("What is field boosting?", "Giving more weight to important fields.", "local score gives heading/section matches more value than body matches."),
    ("What is a seed corpus?", "Built-in sample manual data.", "src/data/manuals.ts and retrieve/index.ts both include seed chunks."),
    ("What is the duplication risk?", "Same seed data exists in frontend and backend.", "They can drift unless moved to a shared database/source."),
    ("What is Realtime used for?", "Live updates from database changes.", "ArchiveSidebar subscribes to uploaded_manuals changes."),
    ("What is the main documentation mismatch?", "Docs mention semantic search and different Gemini versions.", "Code uses token scoring and google/gemini-2.5-flash."),
    ("What is not trained?", "There is no custom ML model training.", "The project uses an external LLM at inference time."),
    ("What passed verification?", "Tests and build.", "npm test passed 19 tests; npm run build succeeded with warnings."),
    ("What is the large chunk warning?", "A build performance warning.", "The JS bundle is over 500 kB after minification."),
    ("What is the stale Browserslist warning?", "Browser compatibility data is outdated.", "Run update tooling later to refresh caniuse-lite."),
    ("What is a production security priority?", "Restrict access to user/org data.", "Add ownership columns, private storage, strict RLS, and JWT verification."),
    ("What is a production accuracy priority?", "Improve retrieval quality.", "Add embeddings or hybrid search plus citation verification."),
    ("What is a production reliability priority?", "Make failures observable.", "Add logging, retries, degraded-mode UI, and monitoring."),
    ("What is persistent chat history?", "Saving conversations to a database.", "Not present in the provided project."),
    ("What is Docker?", "A way to package apps in containers.", "Not present; deployment is more naturally static frontend + Supabase backend."),
    ("What is an LLM tool call?", "A structured response requested from the model.", "retrieve asks Gemini to call respond with answer, used_citation_ids, followups."),
    ("What is chunk extraction?", "Turning documents into smaller passages.", "ingest asks Gemini to emit chunks with section, page, heading, and text."),
    ("What is the safest interview habit?", "Separate facts from future improvements.", "It keeps your explanation credible."),
]
for q, a, c in base_cards:
    flashcards.append((q, a, c))
for i, (q, a, c) in enumerate(flashcards, 1):
    story.append(Paragraph(f"<b>Q{i}: {esc(q)}</b>", styles["Bodyx"]))
    story.append(Paragraph(f"<b>A:</b> {esc(a)}", styles["Smallx"]))
    story.append(Paragraph(f"<b>Project connection:</b> {esc(c)}", styles["Smallx"]))
    add_md(f"**Q:** {q}")
    add_md(f"**A:** {a}")
    add_md(f"**Project connection:** {c}")
    add_md("")

h1("Part 25 - Final Can I Explain This Project? Checklist")
checklist = [
    "Can I explain the problem in simple words?",
    "Can I explain why insurance manuals need citations?",
    "Can I explain the architecture from user to frontend to backend to database/model and back?",
    "Can I trace the stolen-vehicle question end to end?",
    "Can I explain Auth.tsx and Index.tsx?",
    "Can I explain submitQuery?",
    "Can I explain localRetrieve, tokenize, score, and synthesize?",
    "Can I explain retrieve and ingest Edge Functions?",
    "Can I explain the database schema?",
    "Can I explain what is actually implemented versus documented?",
    "Can I say clearly that embeddings/vector DB are not present?",
    "Can I explain Supabase Auth, Storage, Postgres, and Edge Functions?",
    "Can I explain why secrets belong on the backend?",
    "Can I explain citations and CitationCard?",
    "Can I explain the local fallback?",
    "Can I explain testing results?",
    "Can I explain security gaps honestly?",
    "Can I explain scalability bottlenecks?",
    "Can I answer why each technology was chosen?",
    "Can I answer what I would improve next?",
    "Can I explain the project in 5 minutes, 2 minutes, 1 minute, and 30 seconds?",
]
for item in checklist:
    story.append(Paragraph("[ ] " + esc(item), styles["Bodyx"]))
    add_md(f"- [ ] {item}")


doc = SimpleDocTemplate(
    str(PDF_PATH),
    pagesize=A4,
    rightMargin=0.62 * inch,
    leftMargin=0.62 * inch,
    topMargin=0.62 * inch,
    bottomMargin=0.62 * inch,
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
MD_PATH.write_text("\n".join(md), encoding="utf-8")
print(PDF_PATH)
print(MD_PATH)
