import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL (or DIRECT_URL) must be set to seed.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const DEMO_PASSWORD = "Demo@1234";

// The empty Tiptap document. Every new/blank document starts here.
const emptyDoc = { type: "doc", content: [{ type: "paragraph" }] };

/** Build a Tiptap JSON doc from a shallow node list. */
function doc(...content: unknown[]) {
  return { type: "doc", content };
}

function paragraph(text: string) {
  return text
    ? { type: "paragraph", content: [{ type: "text", text }] }
    : { type: "paragraph" };
}

const richContent = doc(
  {
    type: "heading",
    attrs: { level: 1 },
    content: [{ type: "text", text: "Product launch checklist" }],
  },
  paragraph(
    "Owner: Alice. Target: the last week of the quarter. Everything below is coordinated in Docket so Bob and Carol can follow along.",
  ),
  {
    type: "heading",
    attrs: { level: 2 },
    content: [{ type: "text", text: "Before launch" }],
  },
  {
    type: "bulletList",
    content: [
      {
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Freeze the release branch " },
              { type: "text", marks: [{ type: "bold" }], text: "72 hours" },
              { type: "text", text: " before the announcement." },
            ],
          },
        ],
      },
      {
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", marks: [{ type: "italic" }], text: "Draft" },
              { type: "text", text: " the customer email and get sign-off." },
            ],
          },
        ],
      },
      {
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Confirm the status page owner is " },
              { type: "text", marks: [{ type: "underline" }], text: "on call" },
              { type: "text", text: "." },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "heading",
    attrs: { level: 3 },
    content: [{ type: "text", text: "Launch day" }],
  },
  {
    type: "orderedList",
    attrs: { start: 1 },
    content: [
      {
        type: "listItem",
        content: [paragraph("Flip the feature flag at 09:00 IST.")],
      },
      {
        type: "listItem",
        content: [paragraph("Post in #general and send the email campaign.")],
      },
      {
        type: "listItem",
        content: [paragraph("Watch error rates for the first 60 minutes.")],
      },
    ],
  },
  paragraph("Post-launch: retrospective on Friday, notes go in a new Docket.")
);

const hiringContent = doc(
  {
    type: "heading",
    attrs: { level: 1 },
    content: [{ type: "text", text: "Q3 hiring plan" }],
  },
  paragraph(
    "We are opening two backend roles and one design role this quarter. Budget is approved; refer candidates to Alice."
  ),
  {
    type: "bulletList",
    content: [
      {
        type: "listItem",
        content: [paragraph("Backend engineer — Postgres + TypeScript.")],
      },
      { type: "listItem", content: [paragraph("Product designer — design systems.")] },
    ],
  }
);

const meetingContent = doc(
  {
    type: "heading",
    attrs: { level: 2 },
    content: [{ type: "text", text: "Meeting notes — 20 Nov 2026" }],
  },
  paragraph(
    "Attendees: Alice, Bob, Carol. Decided to ship the editor before real-time collaboration; last-write-wins is acceptable for the pilot."
  ),
  {
    type: "orderedList",
    attrs: { start: 1 },
    content: [
      { type: "listItem", content: [paragraph("Ship import for .md and .txt.")] },
      { type: "listItem", content: [paragraph("Revisit conflict handling next month.")] },
    ],
  }
);

const bobContent = doc(
  {
    type: "heading",
    attrs: { level: 1 },
    content: [{ type: "text", text: "Bob's onboarding notes" }],
  },
  paragraph("Read the architecture doc, then ask Alice for an Editor role on the launch checklist.")
);

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const people = [
    { email: "alice@demo.test", name: "Alice Anderson" },
    { email: "bob@demo.test", name: "Bob Bennett" },
    { email: "carol@demo.test", name: "Carol Chen" },
    { email: "dave@demo.test", name: "Dave Diaz" },
  ];

  const users: Record<string, string> = {};

  for (const person of people) {
    const user = await prisma.user.upsert({
      where: { email: person.email },
      update: { name: person.name, passwordHash },
      create: { email: person.email, name: person.name, passwordHash },
    });
    users[person.email] = user.id;
  }

  const documents = [
    {
      id: "seed_doc_launch_checklist",
      ownerId: users["alice@demo.test"],
      title: "Product launch checklist",
      content: richContent,
    },
    {
      id: "seed_doc_hiring_plan",
      ownerId: users["alice@demo.test"],
      title: "Q3 hiring plan",
      content: hiringContent,
    },
    {
      id: "seed_doc_meeting_notes",
      ownerId: users["alice@demo.test"],
      title: "Meeting notes — 20 Nov 2026",
      content: meetingContent,
    },
    {
      id: "seed_doc_bob_notes",
      ownerId: users["bob@demo.test"],
      title: "Bob's onboarding notes",
      content: bobContent,
    },
  ];

  for (const item of documents) {
    await prisma.document.upsert({
      where: { id: item.id },
      update: { title: item.title, content: item.content as never, ownerId: item.ownerId },
      create: {
        id: item.id,
        ownerId: item.ownerId,
        title: item.title,
        content: item.content as never,
      },
    });
  }

  // Keep one document untouched by the emptyDoc helper so a fresh install always
  // has a blank-able document available for demos.
  await prisma.document.upsert({
    where: { id: "seed_doc_blank" },
    update: {},
    create: {
      id: "seed_doc_blank",
      ownerId: users["alice@demo.test"],
      title: "Untitled document",
      content: emptyDoc as never,
    },
  });

  const shares = [
    {
      documentId: "seed_doc_launch_checklist",
      userId: users["bob@demo.test"],
      role: "VIEWER" as const,
    },
    {
      documentId: "seed_doc_hiring_plan",
      userId: users["carol@demo.test"],
      role: "EDITOR" as const,
    },
  ];

  for (const share of shares) {
    await prisma.documentShare.upsert({
      where: {
        documentId_userId: { documentId: share.documentId, userId: share.userId },
      },
      update: { role: share.role },
      create: share,
    });
  }

  console.log(
    `Seeded ${people.length} users, ${documents.length + 1} documents, ${shares.length} shares.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
