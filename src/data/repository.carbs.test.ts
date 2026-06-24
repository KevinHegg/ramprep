import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  createCarbEntry,
  createWorkoutLog,
  deleteCarbEntry,
  exportAllData,
  getAppData,
  getPrivateSetting,
  importAllData,
  initializeAppData,
  saveCarbPreset,
  saveCarbSettings,
  savePrivateSetting,
  USDA_API_KEY_PRIVATE_SETTING_KEY,
  updateCarbEntry,
} from './repository'

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
})

describe('carb repository operations', () => {
  it('creates, edits, and deletes manual carb entries without touching workout logs', async () => {
    await initializeAppData()
    await createWorkoutLog({ name: 'Free workout' }, [], { totalMinutes: 20 })
    const initial = await getAppData()
    expect(initial.workoutLogs).toHaveLength(1)

    const created = await createCarbEntry({
      dateISO: '2026-06-22',
      mealSlot: 'breakfast',
      netCarbs: 12.4,
      sourceType: 'manual',
      sourceLabel: 'manual',
      goalGramsAtEntry: initial.carbSettings.dailyNetCarbGoalGrams,
    })

    expect((await getAppData()).carbEntries[0]).toMatchObject({ id: created.id, netCarbs: 12 })

    await updateCarbEntry({ ...created, netCarbs: 8, mealSlot: 'lunch' })
    expect((await getAppData()).carbEntries[0]).toMatchObject({ netCarbs: 8, mealSlot: 'lunch' })

    await deleteCarbEntry(created.id)
    const afterDelete = await getAppData()
    expect(afterDelete.carbEntries).toHaveLength(0)
    expect(afterDelete.workoutLogs).toHaveLength(1)
  })

  it('exports carb entries and presets while excluding the USDA key by default', async () => {
    await initializeAppData()
    const data = await getAppData()
    await savePrivateSetting(USDA_API_KEY_PRIVATE_SETTING_KEY, 'private-key')
    await saveCarbSettings({ ...data.carbSettings, dailyNetCarbGoalGrams: 60 })
    await createCarbEntry({
      dateISO: '2026-06-22',
      mealSlot: 'dinner',
      netCarbs: 15,
      sourceType: 'manual',
      sourceLabel: 'manual',
      goalGramsAtEntry: 60,
    })
    await saveCarbPreset({ name: 'usual yogurt', netCarbs: 8, servingDescription: 'cup', sourceType: 'preset' })

    const exported = JSON.parse(await exportAllData()) as { data: Awaited<ReturnType<typeof getAppData>> }
    expect(exported.data.carbEntries).toHaveLength(1)
    expect(exported.data.carbPresets).toHaveLength(1)
    expect('foodDataCentralApiKey' in exported.data.carbSettings).toBe(false)

    const exportedPrivate = JSON.parse(await exportAllData({ includePrivateSettings: true })) as {
      data: Awaited<ReturnType<typeof getAppData>>
    }
    expect('foodDataCentralApiKey' in exportedPrivate.data.carbSettings).toBe(false)
    expect((await getPrivateSetting(USDA_API_KEY_PRIVATE_SETTING_KEY))?.encryptedOrPlainValue).toBe('private-key')
  })

  it('imports carb entries, goal history, and presets from backup JSON', async () => {
    await initializeAppData()
    const data = await getAppData()
    await createCarbEntry({
      dateISO: '2026-06-22',
      mealSlot: 'morningSnack',
      netCarbs: 5,
      sourceType: 'manual',
      sourceLabel: 'manual',
      goalGramsAtEntry: data.carbSettings.dailyNetCarbGoalGrams,
    })
    await saveCarbPreset({ name: 'small snack', netCarbs: 5, sourceType: 'preset' })
    const backup = await exportAllData()

    db.close()
    await db.delete()
    await db.open()
    await importAllData(backup)
    const imported = await getAppData()

    expect(imported.carbEntries).toHaveLength(1)
    expect(imported.carbPresets).toHaveLength(1)
    expect(imported.carbGoalHistory.length).toBeGreaterThan(0)
  })
})
