#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const templatePath = path.join(root, 'deploy/render/mcphub/mcp_settings.render.json')

const tradierApiKey = process.env.TRADIER_API_KEY
const adminPasswordHash = process.env.MCPHUB_ADMIN_PASSWORD_BCRYPT
const bearerToken = process.env.MCPHUB_BEARER_TOKEN ?? crypto.randomBytes(24).toString('hex')

if (!tradierApiKey) {
  console.error('Missing required env: TRADIER_API_KEY')
  process.exit(1)
}

if (!adminPasswordHash) {
  console.error('Missing required env: MCPHUB_ADMIN_PASSWORD_BCRYPT')
  process.exit(1)
}

const raw = fs.readFileSync(templatePath, 'utf8')
const rendered = raw
  .replaceAll('__TRADIER_API_KEY__', tradierApiKey)
  .replaceAll('__BCRYPT_HASH_FOR_ADMIN_PASSWORD__', adminPasswordHash)
  .replaceAll('__MCPHUB_BEARER_TOKEN__', bearerToken)

fs.writeFileSync(templatePath, rendered)
console.log('Updated deploy/render/mcphub/mcp_settings.render.json')
console.log(`MCPHUB bearer token: ${bearerToken}`)
console.log(`Set app-server MCPHUB_AUTH_HEADER to: Bearer ${bearerToken}`)
