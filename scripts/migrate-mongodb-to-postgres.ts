/**
 * Migration script: Export MongoDB data → JSON files, then import into PostgreSQL via Prisma
 * 
 * Usage:
 *   1. Ensure MONGODB_URI is set in .env
 *   2. Ensure DATABASE_URL is set in .env (pointing to your PostgreSQL)
 *   3. Run: npx tsx scripts/migrate-mongodb-to-postgres.ts
 * 
 * Flags:
 *   --export-only    Only export from MongoDB to JSON files
 *   --import-only    Only import from JSON files to PostgreSQL
 *   --no-export      Skip export step
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const EXPORT_DIR = path.join(__dirname, '..', 'data-export');

// Ensure export directory exists
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

const args = process.argv.slice(2);
const EXPORT_ONLY = args.includes('--export-only');
const IMPORT_ONLY = args.includes('--import-only');
const NO_EXPORT = args.includes('--no-export');

async function exportFromMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not set in .env');
    process.exit(1);
  }

  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 90000,
    connectTimeoutMS: 60000,
  });
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db!;
  const collections = ['subscribers', 'campaigns', 'campaignevents', 'emailtemplates', 'users'];

  for (const collectionName of collections) {
    console.log(`📦 Exporting collection: ${collectionName}`);
    const docs = await db.collection(collectionName).find({}).toArray();
    const filePath = path.join(EXPORT_DIR, `${collectionName}.json`);

    // Map _id to id for Prisma compatibility
    const mapped = docs.map((doc: any) => {
      const obj = { ...doc };
      if (obj._id) {
        obj.id = obj._id.toString();
        delete obj._id;
      }
      delete obj.__v;
      return obj;
    });

    fs.writeFileSync(filePath, JSON.stringify(mapped, null, 2));
    console.log(`   ✅ Exported ${mapped.length} documents to ${filePath}`);
  }

  await mongoose.disconnect();
  console.log('✅ MongoDB export complete');
}

async function importToPostgres() {
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL');

    // Import Subscribers
    const subscribersPath = path.join(EXPORT_DIR, 'subscribers.json');
    if (fs.existsSync(subscribersPath)) {
      const subscribers = JSON.parse(fs.readFileSync(subscribersPath, 'utf-8'));
      console.log(`📥 Importing ${subscribers.length} subscribers...`);
      let imported = 0;
      for (const sub of subscribers) {
        try {
          await prisma.subscriber.upsert({
            where: { email: sub.email },
            update: {
              name: sub.name,
              status: sub.status || 'Active',
              dateAdded: sub.dateAdded || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              avatarUrl: sub.avatarUrl || null,
              initials: sub.initials || null,
              plan: sub.plan || 'Free',
              roster: sub.roster || 'General',
              rosterName: sub.rosterName || sub.roster || 'General',
            },
            create: {
              id: sub.id,
              name: sub.name,
              email: sub.email,
              status: sub.status || 'Active',
              dateAdded: sub.dateAdded || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              avatarUrl: sub.avatarUrl || null,
              initials: sub.initials || null,
              plan: sub.plan || 'Free',
              roster: sub.roster || 'General',
              rosterName: sub.rosterName || sub.roster || 'General',
              createdAt: sub.createdAt ? new Date(sub.createdAt) : undefined,
              updatedAt: sub.updatedAt ? new Date(sub.updatedAt) : undefined,
            },
          });
          imported++;
        } catch (err: any) {
          console.error(`   ❌ Failed to import subscriber ${sub.email}: ${err.message}`);
        }
      }
      console.log(`   ✅ Imported ${imported} subscribers`);
    }

    // Import Campaigns
    const campaignsPath = path.join(EXPORT_DIR, 'campaigns.json');
    if (fs.existsSync(campaignsPath)) {
      const campaigns = JSON.parse(fs.readFileSync(campaignsPath, 'utf-8'));
      console.log(`📥 Importing ${campaigns.length} campaigns...`);
      let imported = 0;
      for (const camp of campaigns) {
        try {
          await prisma.campaign.upsert({
            where: { id: camp.id },
            update: {
              name: camp.name,
              status: camp.status || 'DRAFT',
              recipients: camp.recipients || 0,
              openRate: camp.openRate !== undefined ? camp.openRate : null,
              createdDate: camp.createdDate || null,
              subjectLine: camp.subjectLine || null,
              senderName: camp.senderName || null,
              replyTo: camp.replyTo || null,
              templateId: camp.templateId || null,
              emailElements: camp.emailElements || [],
              targetLists: camp.targetLists || [],
              scheduledAt: camp.scheduledAt || null,
            },
            create: {
              id: camp.id,
              name: camp.name,
              status: camp.status || 'DRAFT',
              recipients: camp.recipients || 0,
              openRate: camp.openRate !== undefined ? camp.openRate : null,
              createdDate: camp.createdDate || null,
              subjectLine: camp.subjectLine || null,
              senderName: camp.senderName || null,
              replyTo: camp.replyTo || null,
              templateId: camp.templateId || null,
              emailElements: camp.emailElements || [],
              targetLists: camp.targetLists || [],
              scheduledAt: camp.scheduledAt || null,
              createdAt: camp.createdAt ? new Date(camp.createdAt) : undefined,
              updatedAt: camp.updatedAt ? new Date(camp.updatedAt) : undefined,
            },
          });
          imported++;
        } catch (err: any) {
          console.error(`   ❌ Failed to import campaign ${camp.name}: ${err.message}`);
        }
      }
      console.log(`   ✅ Imported ${imported} campaigns`);
    }

    // Import CampaignEvents
    const eventsPath = path.join(EXPORT_DIR, 'campaignevents.json');
    if (fs.existsSync(eventsPath)) {
      const events = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));
      console.log(`📥 Importing ${events.length} campaign events...`);
      let imported = 0;
      for (const ev of events) {
        try {
          await prisma.campaignEvent.create({
            data: {
              id: ev.id,
              campaignId: ev.campaignId,
              email: ev.email,
              name: ev.name,
              eventType: ev.eventType,
              timestamp: ev.timestamp ? new Date(ev.timestamp) : new Date(),
              url: ev.url || null,
              userAgent: ev.userAgent || null,
              ipAddress: ev.ipAddress || null,
              createdAt: ev.createdAt ? new Date(ev.createdAt) : undefined,
              updatedAt: ev.updatedAt ? new Date(ev.updatedAt) : undefined,
            },
          });
          imported++;
        } catch (err: any) {
          console.error(`   ❌ Failed to import campaign event: ${err.message}`);
        }
      }
      console.log(`   ✅ Imported ${imported} campaign events`);
    }

    // Import EmailTemplates
    const templatesPath = path.join(EXPORT_DIR, 'emailtemplates.json');
    if (fs.existsSync(templatesPath)) {
      const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));
      console.log(`📥 Importing ${templates.length} templates...`);
      let imported = 0;
      for (const tmpl of templates) {
        try {
          await prisma.emailTemplate.upsert({
            where: { id: tmpl.id },
            update: {
              name: tmpl.name,
              description: tmpl.description,
              thumbnailAlt: tmpl.thumbnailAlt || null,
              thumbnailUrl: tmpl.thumbnailUrl || null,
              elements: tmpl.elements || [],
            },
            create: {
              id: tmpl.id,
              name: tmpl.name,
              description: tmpl.description,
              thumbnailAlt: tmpl.thumbnailAlt || null,
              thumbnailUrl: tmpl.thumbnailUrl || null,
              elements: tmpl.elements || [],
              createdAt: tmpl.createdAt ? new Date(tmpl.createdAt) : undefined,
              updatedAt: tmpl.updatedAt ? new Date(tmpl.updatedAt) : undefined,
            },
          });
          imported++;
        } catch (err: any) {
          console.error(`   ❌ Failed to import template ${tmpl.name}: ${err.message}`);
        }
      }
      console.log(`   ✅ Imported ${imported} templates`);
    }

    // Import Users
    const usersPath = path.join(EXPORT_DIR, 'users.json');
    if (fs.existsSync(usersPath)) {
      const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      console.log(`📥 Importing ${users.length} users...`);
      let imported = 0;
      for (const user of users) {
        try {
          await prisma.user.upsert({
            where: { email: user.email },
            update: {
              password: user.password,
              name: user.name || 'Admin',
              role: user.role || 'admin',
            },
            create: {
              id: user.id,
              email: user.email,
              password: user.password,
              name: user.name || 'Admin',
              role: user.role || 'admin',
              createdAt: user.createdAt ? new Date(user.createdAt) : undefined,
              updatedAt: user.updatedAt ? new Date(user.updatedAt) : undefined,
            },
          });
          imported++;
        } catch (err: any) {
          console.error(`   ❌ Failed to import user ${user.email}: ${err.message}`);
        }
      }
      console.log(`   ✅ Imported ${imported} users`);
    }

    console.log('✅ PostgreSQL import complete');
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  if (!IMPORT_ONLY && !NO_EXPORT) {
    await exportFromMongoDB();
  }

  if (!EXPORT_ONLY) {
    await importToPostgres();
  }

  console.log('🎉 Migration complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});