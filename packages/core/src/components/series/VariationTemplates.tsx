import {Box, Button, Card, Flex, Label, Stack, Tab, TabList, TabPanel, Text, TextInput} from '@sanity/ui'
import {useCallback, useState} from 'react'
import {AddIcon} from '@sanity/icons'
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
  const [customVariationInput, setCustomVariationInput] = useState<string>('')

  // Get templates matching the current variation type
  const matchingTemplates = Object.values(variationTemplates).filter(
    (template) => template.type === variationType,
  )

  const handleSelectTemplate = useCallback(
    (template: VariationTemplate) => {
      console.log('Template selected:', template.name, 'Variations:', template.variations.slice(0, quantity))
      // Use the template's variations, limited to quantity
      onVariationsChange(template.variations.slice(0, quantity))
      // Switch to custom tab to show selected variations
      setActiveTab('custom')
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

  const handleAddCustomVariation = useCallback(() => {
    const trimmedInput = customVariationInput.trim()

    if (!trimmedInput) return

    // Check if already exists
    if (selectedVariations.includes(trimmedInput)) {
      setCustomVariationInput('')
      return
    }

    // Check if we've reached the limit
    if (selectedVariations.length >= quantity) return

    // Add the new variation
    onVariationsChange([...selectedVariations, trimmedInput])
    setCustomVariationInput('')
  }, [customVariationInput, selectedVariations, onVariationsChange, quantity])

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddCustomVariation()
      }
    },
    [handleAddCustomVariation],
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
            <Card key={template.name} padding={4} radius={2} shadow={1} tone="default">
              <Stack space={4}>
                <Flex align="flex-start" justify="space-between" gap={3}>
                  <Box flex={1}>
                    <Stack space={2}>
                      <Text size={2} weight="semibold">
                        {template.name}
                      </Text>
                      <Text size={1} muted>
                        {template.description}
                      </Text>
                    </Stack>
                  </Box>
                  <Button
                    text="Select"
                    mode="ghost"
                    tone="primary"
                    onClick={() => handleSelectTemplate(template)}
                    fontSize={1}
                  />
                </Flex>

                <Card padding={3} tone="transparent" border>
                  <Stack space={2}>
                    <Text size={1} weight="semibold">
                      Variations ({template.variations.length}):
                    </Text>
                    <Stack space={1} paddingLeft={2}>
                      {template.variations.slice(0, 3).map((variation, index) => (
                        <Text key={index} size={1} muted>
                          • {variation}
                        </Text>
                      ))}
                      {template.variations.length > 3 && (
                        <Text size={1} muted style={{fontStyle: 'italic'}}>
                          ... and {template.variations.length - 3} more
                        </Text>
                      )}
                    </Stack>
                  </Stack>
                </Card>
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

          {/* Add custom variation input */}
          <Card padding={3} border radius={2} tone="primary">
            <Stack space={3}>
              <Text size={1} weight="semibold">
                Add Custom Variation
              </Text>
              <Flex gap={2} align="flex-end">
                <Box flex={1}>
                  <TextInput
                    placeholder="E.g., front view, dramatic lighting, close-up..."
                    value={customVariationInput}
                    onChange={(e) => setCustomVariationInput(e.currentTarget.value)}
                    onKeyPress={handleKeyPress}
                    disabled={selectedVariations.length >= quantity}
                  />
                </Box>
                <Button
                  text="Add"
                  icon={AddIcon}
                  tone="primary"
                  onClick={handleAddCustomVariation}
                  disabled={!customVariationInput.trim() || selectedVariations.length >= quantity}
                />
              </Flex>
              {selectedVariations.length >= quantity && (
                <Text size={0} muted>
                  Maximum variations reached. Remove existing variations to add new ones.
                </Text>
              )}
            </Stack>
          </Card>

          {selectedVariations.length === 0 && (
            <Text size={1} muted align="center">
              No variations selected. Add custom variations above or select from templates.
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

          {selectedVariations.length > 0 && (
            <Box paddingTop={2}>
              <Text size={0} muted>
                Tip: Select a template from the Templates tab to quickly populate variations
              </Text>
            </Box>
          )}
        </Stack>
      </TabPanel>
    </Card>
  )
}
