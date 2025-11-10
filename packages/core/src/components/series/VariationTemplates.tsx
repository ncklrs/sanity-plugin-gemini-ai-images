import {Box, Button, Card, Flex, Label, Stack, Tab, TabList, TabPanel, Text} from '@sanity/ui'
import {useCallback, useState} from 'react'
import {variationTemplates, type VariationTemplate} from '../../lib/variation-templates.js'
import type {VariationType} from '../../types.js'

interface VariationTemplatesProps {
  variationType: VariationType
  selectedVariations: string[]
  onVariationsChange: (variations: string[]) => void
  quantity: number
}

export function VariationTemplates({
  variationType,
  selectedVariations,
  onVariationsChange,
  quantity,
}: VariationTemplatesProps) {
  const [activeTab, setActiveTab] = useState<string>('templates')

  // Get templates matching the current variation type
  const matchingTemplates = Object.values(variationTemplates).filter(
    (template) => template.type === variationType,
  )

  const handleSelectTemplate = useCallback(
    (template: VariationTemplate) => {
      // Use the template's variations, limited to quantity
      onVariationsChange(template.variations.slice(0, quantity))
    },
    [onVariationsChange, quantity],
  )

  const handleToggleVariation = useCallback(
    (variation: string) => {
      const isSelected = selectedVariations.includes(variation)

      if (isSelected) {
        onVariationsChange(selectedVariations.filter((v) => v !== variation))
      } else {
        if (selectedVariations.length < quantity) {
          onVariationsChange([...selectedVariations, variation])
        }
      }
    },
    [selectedVariations, onVariationsChange, quantity],
  )

  return (
    <Card>
      <TabList space={2}>
        <Tab
          aria-controls="templates-panel"
          id="templates-tab"
          label="Templates"
          onClick={() => setActiveTab('templates')}
          selected={activeTab === 'templates'}
        />
        <Tab
          aria-controls="custom-panel"
          id="custom-tab"
          label="Custom"
          onClick={() => setActiveTab('custom')}
          selected={activeTab === 'custom'}
        />
      </TabList>

      <TabPanel aria-labelledby="templates-tab" id="templates-panel" hidden={activeTab !== 'templates'}>
        <Stack space={4} padding={4}>
          {matchingTemplates.length === 0 && (
            <Text size={1} muted align="center">
              No templates available for this variation type
            </Text>
          )}

          {matchingTemplates.map((template) => (
            <Card key={template.name} padding={3} radius={2} shadow={1} tone="default">
              <Stack space={3}>
                <Flex align="center" justify="space-between">
                  <Box flex={1}>
                    <Label size={1} weight="semibold">
                      {template.name}
                    </Label>
                    <Text size={1} muted>
                      {template.description}
                    </Text>
                  </Box>
                  <Button
                    text="Use Template"
                    mode="ghost"
                    tone="primary"
                    onClick={() => handleSelectTemplate(template)}
                    fontSize={1}
                  />
                </Flex>

                <Stack space={2}>
                  <Text size={0} weight="semibold" muted>
                    Variations ({template.variations.length}):
                  </Text>
                  {template.variations.slice(0, 3).map((variation, index) => (
                    <Text key={index} size={0} muted style={{fontStyle: 'italic'}}>
                      • {variation}
                    </Text>
                  ))}
                  {template.variations.length > 3 && (
                    <Text size={0} muted>
                      ... and {template.variations.length - 3} more
                    </Text>
                  )}
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
      </TabPanel>

      <TabPanel aria-labelledby="custom-tab" id="custom-panel" hidden={activeTab !== 'custom'}>
        <Stack space={4} padding={4}>
          <Box>
            <Label size={1} muted>
              Selected Variations ({selectedVariations.length} of {quantity})
            </Label>
          </Box>

          {selectedVariations.length === 0 && (
            <Text size={1} muted align="center">
              No variations selected. Click variations from templates or add custom ones.
            </Text>
          )}

          <Stack space={2}>
            {selectedVariations.map((variation, index) => (
              <Card key={index} padding={3} radius={2} tone="transparent" border>
                <Flex align="center" justify="space-between">
                  <Text size={1}>{variation}</Text>
                  <Button
                    text="Remove"
                    mode="ghost"
                    tone="critical"
                    onClick={() => handleToggleVariation(variation)}
                    fontSize={1}
                  />
                </Flex>
              </Card>
            ))}
          </Stack>

          <Box paddingTop={2}>
            <Text size={0} muted>
              Tip: Select a template from the Templates tab to automatically populate variations
            </Text>
          </Box>
        </Stack>
      </TabPanel>
    </Card>
  )
}
