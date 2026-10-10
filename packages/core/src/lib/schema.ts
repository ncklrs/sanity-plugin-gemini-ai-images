import {defineType, defineField} from 'sanity'
const text = (name: string) => defineField({name, type: 'text'})
const string = (name: string) => defineField({name, type: 'string'})
export const aiGenerationRecord = defineType({
  name: 'aiGenerationRecord',
  title: 'AI generation history',
  type: 'document',
  fields: [
    string('createdAt'),
    text('prompt'),
    string('model'),
    string('owner'),
    string('jobId'),
    string('documentId'),
    string('title'),
    text('alt'),
    text('caption'),
    defineField({
      name: 'asset',
      type: 'reference',
      to: [{type: 'sanity.imageAsset'}, {type: 'sanity.fileAsset'}],
    }),
    defineField({
      name: 'sourceAssetIds',
      type: 'array',
      of: [{type: 'string'}],
    }),
    text('parametersJSON'),
  ],
})
export const aiBrandPreset = defineType({
  name: 'aiBrandPreset',
  title: 'AI brand preset',
  type: 'document',
  fields: [
    string('name'),
    text('instructions'),
    text('negativeInstructions'),
    string('model'),
    string('aspectRatio'),
    string('resolution'),
  ],
})
export const aiGenerationJob = defineType({
  name: 'aiGenerationJob',
  title: 'AI generation job',
  type: 'document',
  readOnly: true,
  fields: [
    string('owner'),
    string('kind'),
    string('fingerprint'),
    string('createdAt'),
    string('updatedAt'),
    string('status'),
    text('requestJSON'),
    text('itemsJSON'),
    text('anchorJSON'),
  ],
})
export const aiGenerationBudget = defineType({
  name: 'aiGenerationBudget',
  title: 'AI generation quota',
  type: 'document',
  readOnly: true,
  fields: [
    string('scope'),
    defineField({name: 'count', type: 'number'}),
    defineField({name: 'costUsd', type: 'number'}),
    string('expiresAt'),
    defineField({name: 'reservations', type: 'array', of: [{type: 'string'}]}),
  ],
})
export const aiGenerationSession = defineType({
  name: 'aiGenerationSession',
  title: 'AI generation session',
  type: 'document',
  fields: [
    string('timestamp'),
    text('resultsJSON'),
    defineField({name: 'savedImages', type: 'array', of: [{type: 'string'}]}),
  ],
})
export const aiMediaSchemaTypes = [
  aiGenerationRecord,
  aiBrandPreset,
  aiGenerationJob,
  aiGenerationBudget,
  aiGenerationSession,
]
