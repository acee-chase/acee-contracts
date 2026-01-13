-- SSF V1 Mainnet Smoke Wallet Selection
-- Execute against sales-core-mvp database
-- 
-- Criteria:
-- 1. Must be from test_wallets OR vault_wallets(role='test')
-- 2. Status must be 'idle'
-- 3. Must have usable private_key
-- 4. NOT from agent_wallets (too high attack surface)

-- ============================================
-- Option 1: Select from test_wallets (PREFERRED)
-- ============================================
SELECT 
  id,
  wallet_address as address,
  'test_wallets' as source_table,
  status,
  label,
  created_at
FROM test_wallets
WHERE status = 'idle'
  AND private_key IS NOT NULL
  AND private_key != ''
ORDER BY created_at ASC
LIMIT 2;

-- ============================================
-- Option 2: Select from vault_wallets (role='test')
-- ============================================
SELECT 
  id,
  wallet_address as address,
  'vault_wallets' as source_table,
  status,
  role,
  created_at
FROM vault_wallets
WHERE status = 'idle'
  AND role = 'test'
  AND private_key IS NOT NULL
  AND private_key != ''
ORDER BY created_at ASC
LIMIT 2;

-- ============================================
-- After selection, update status and tags
-- ============================================
-- Replace [ID_1] and [ID_2] with selected IDs

-- For test_wallets:
-- UPDATE test_wallets
-- SET 
--   status = 'in_use',
--   metadata = COALESCE(metadata, '{}'::jsonb) || '{"tags": ["smoke", "mainnet-ssf-v1"]}'::jsonb
-- WHERE id IN ([ID_1], [ID_2]);

-- For vault_wallets:
-- UPDATE vault_wallets
-- SET 
--   status = 'in_use',
--   metadata = COALESCE(metadata, '{}'::jsonb) || '{"tags": ["smoke", "mainnet-ssf-v1"]}'::jsonb
-- WHERE id IN ([ID_1], [ID_2]);
