#!/usr/bin/env node
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs/promises");
const path = require("path");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLEANUP_DAYS = Number(process.env.CLEANUP_DAYS || "3");
const FACEBOOK_DELETE_ENABLED = process.env.DELETE_FACEBOOK_POSTS === "true";
const FACEBOOK_GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v24.0";
const CACHE_DIRS = [".next/cache", "node_modules/.cache"];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE URL or SERVICE ROLE KEY. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (Number.isNaN(CLEANUP_DAYS) || CLEANUP_DAYS <= 0) {
  console.error("CLEANUP_DAYS must be a positive integer.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const cutoffDate = new Date(Date.now() - CLEANUP_DAYS * 24 * 60 * 60 * 1000).toISOString();

async function deleteRows(table, timestampColumn) {
  console.log(`Cleaning up ${table} rows older than ${cutoffDate}...`);
  const { error, data } = await supabase
    .from(table)
    .delete()
    .lt(timestampColumn, cutoffDate)
    .select("id");

  if (error) {
    console.error(`Failed cleaning ${table}:`, error.message || error);
    return;
  }

  console.log(`Deleted ${Array.isArray(data) ? data.length : 0} rows from ${table}.`);
}

async function deleteOldFacebookPosts() {
  if (!FACEBOOK_DELETE_ENABLED) {
    console.log("Facebook post deletion is disabled. Set DELETE_FACEBOOK_POSTS=true to enable.");
    return;
  }

  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.error("Missing FACEBOOK_PAGE_ACCESS_TOKEN. Cannot delete Facebook posts.");
    return;
  }

  console.log(`Deleting Facebook posts older than ${cutoffDate}...`);
  const { error, data } = await supabase
    .from("platform_results")
    .select("id, provider_id, created_at")
    .eq("platform", "facebook")
    .eq("status", "published")
    .lt("created_at", cutoffDate)
    .limit(200);

  if (error) {
    console.error("Failed loading old Facebook publish results:", error.message || error);
    return;
  }

  if (!Array.isArray(data) || data.length === 0) {
    console.log("No eligible Facebook posts found for deletion.");
    return;
  }

  for (const result of data) {
    if (!result.provider_id) {
      continue;
    }

    const url = `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${encodeURIComponent(result.provider_id)}`;
    try {
      const response = await fetch(url, {
        method: "DELETE",
        body: new URLSearchParams({ access_token: token }),
      });
      const body = await response.text();
      if (response.ok) {
        console.log(`Deleted Facebook post ${result.provider_id} (record ${result.id}).`);
      } else {
        console.warn(`Failed to delete Facebook post ${result.provider_id}: ${response.status} ${body}`);
      }
    } catch (fetchError) {
      console.warn(`Error deleting Facebook post ${result.provider_id}:`, fetchError.message || fetchError);
    }
  }
}

async function removeCacheDirectories() {
  const root = path.resolve(__dirname, "..");

  for (const dir of CACHE_DIRS) {
    const location = path.join(root, dir);
    try {
      await fs.rm(location, { recursive: true, force: true });
      console.log(`Removed cache directory: ${location}`);
    } catch (error) {
      console.warn(`Unable to remove cache directory ${location}:`, error.message || error);
    }
  }
}

async function run() {
  console.log("Starting cleanup for old production data and cache.");
  await deleteRows("platform_results", "created_at");
  await deleteRows("publish_attempts", "created_at");
  await deleteRows("webhook_events", "received_at");
  await deleteRows("audit_logs", "created_at");
  await deleteRows("scheduled_posts", "created_at");
  await deleteRows("media_assets", "created_at");
  await deleteOldFacebookPosts();
  await removeCacheDirectories();
  console.log("Cleanup complete.");
}

run().catch((error) => {
  console.error("Cleanup script failed:", error);
  process.exit(1);
});
