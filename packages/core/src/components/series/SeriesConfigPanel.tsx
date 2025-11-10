import {Box, Card, Flex, Label, Select, Stack, Text} from '@sanity/ui'
import {useCallback} from 'react'
import type {VariationType, ConsistencyLevel} from '../../types.js'

interface SeriesConfigPanelProps {
  quantity: number
  variationType: VariationType
  consistencyLevel: ConsistencyLevel
  onQuantityChange: (quantity: number) => void
  onVariationTypeChange: (type: VariationType) => void
  onConsistencyLevelChange: (level: ConsistencyLevel) => void
}

export function SeriesConfigPanel({
  quantity,
  variationType,
  consistencyLevel,
  onQuantityChange,
  onVariationTypeChange,
  onConsistencyLevelChange,
}: SeriesConfigPanelProps) {
  const handleQuantityChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onQuantityChange(parseInt(event.target.value, 10))
    },
    [onQuantityChange],
  )

  const handleVariationTypeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      onVariationTypeChange(event.target.value as VariationType)
    },
    [onVariationTypeChange],
  )

  const handleConsistencyLevelChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      onConsistencyLevelChange(event.target.value as ConsistencyLevel)
    },
    [onConsistencyLevelChange],
  )

  return (
    <Card padding={4} radius={2} shadow={1}>
      <Stack space={4}>
        <Box>
          <Label size={1} weight="semibold" muted>
            Series Configuration
          </Label>
        </Box>

        <Stack space={3}>
          <Flex align="center" justify="space-between">
            <Label size={1}>Quantity</Label>
            <Text size={1} weight="semibold">
              {quantity} images
            </Text>
          </Flex>
          <input
            type="range"
            min="2"
            max="10"
            step="1"
            value={quantity}
            onChange={handleQuantityChange}
            style={{width: '100%'}}
          />
        </Stack>

        <Stack space={2}>
          <Label size={1}>Variation Type</Label>
          <Select value={variationType} onChange={handleVariationTypeChange}>
            <option value="angle">Different Angles</option>
            <option value="context">Different Contexts</option>
            <option value="background">Different Backgrounds</option>
            <option value="lighting">Different Lighting</option>
            <option value="custom">Custom Variations</option>
          </Select>
          <Text size={0} muted>
            {variationType === 'angle' && 'Generate the same subject from various camera angles'}
            {variationType === 'context' &&
              'Show the subject in different settings or environments'}
            {variationType === 'background' && 'Keep subject consistent, vary backgrounds'}
            {variationType === 'lighting' && 'Maintain composition, vary lighting moods'}
            {variationType === 'custom' && 'Use custom variation prompts'}
          </Text>
        </Stack>

        <Stack space={2}>
          <Label size={1}>Consistency Level</Label>
          <Select value={consistencyLevel} onChange={handleConsistencyLevelChange}>
            <option value="strict">Strict - Minimal variation</option>
            <option value="moderate">Moderate - Balanced variation</option>
            <option value="loose">Loose - Creative freedom</option>
          </Select>
          <Text size={0} muted>
            {consistencyLevel === 'strict' &&
              'Exact same style, only specified element varies'}
            {consistencyLevel === 'moderate' &&
              'Consistent aesthetic with natural variations'}
            {consistencyLevel === 'loose' &&
              'General theme maintained, creative interpretation'}
          </Text>
        </Stack>
      </Stack>
    </Card>
  )
}
