import React from 'react'
import {Card, Stack, Text, Grid, Button} from '@sanity/ui'
import {promptTemplates, templateCategories} from '../lib/prompt-templates'
import type {AspectRatio} from '../types'

interface PresetTemplatesProps {
  onSelectTemplate: (template: {prompt: string; aspectRatio?: AspectRatio}) => void
}

export function PresetTemplates({onSelectTemplate}: PresetTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('product')

  const filteredTemplates = Object.entries(promptTemplates).filter(
    ([, template]) => template.category === selectedCategory
  )

  return (
    <Stack space={3}>
      <Text size={1} weight="semibold">
        Quick Templates
      </Text>

      {/* Category Tabs */}
      <Grid columns={5} gap={2}>
        {Object.entries(templateCategories).map(([key, label]) => (
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
              const prompt =
                typeof template.prompt === 'function'
                  ? template.prompt('[describe your subject]', '[optional context]')
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
