import {Card, Stack, Text, Grid, Button} from '@sanity/ui'
import {editPromptTemplates, editTemplateCategories} from '../lib/edit-prompt-templates.js'
import type {AspectRatio} from '../types.js'
import {useState} from 'react'

interface EditPromptTemplatesProps {
  onSelectTemplate: (template: {prompt: string; aspectRatio?: AspectRatio}) => void
}

export function EditPromptTemplates({onSelectTemplate}: EditPromptTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('background')

  const filteredTemplates = Object.entries(editPromptTemplates).filter(
    ([, template]) => template.category === selectedCategory
  )

  return (
    <Stack space={3}>
      <Text size={1} weight="semibold">
        Edit Templates
      </Text>

      {/* Category Tabs */}
      <Grid columns={4} gap={2}>
        {Object.entries(editTemplateCategories).map(([key, label]) => (
          <Button
            key={key}
            text={label}
            mode={selectedCategory === key ? 'default' : 'ghost'}
            onClick={() => setSelectedCategory(key)}
            fontSize={1}
            padding={2}
          />
        ))}
      </Grid>

      {/* Templates */}
      <Grid columns={2} gap={3}>
        {filteredTemplates.map(([key, template]) => (
          <Card
            key={key}
            padding={3}
            border
            radius={2}
            tone="default"
            style={{cursor: 'pointer'}}
            onClick={() => {
              const prompt = typeof template.prompt === 'function'
                ? template.prompt('[describe modification]')
                : template.prompt
              onSelectTemplate({
                prompt,
                aspectRatio: template.aspectRatio,
              })
            }}
          >
            <Stack space={2}>
              <Text size={1} weight="semibold">
                {template.name}
              </Text>
              <Text size={1} muted>
                {template.description}
              </Text>
            </Stack>
          </Card>
        ))}
      </Grid>
    </Stack>
  )
}
