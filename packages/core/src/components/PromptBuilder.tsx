import {useState, useEffect} from 'react'
import {Stack, TextInput, Select, Text, Card} from '@sanity/ui'

interface PromptBuilderProps {
  onPromptChange: (prompt: string) => void
}

export function PromptBuilder({onPromptChange}: PromptBuilderProps) {
  const [subject, setSubject] = useState('')
  const [style, setStyle] = useState('photorealistic')
  const [lighting, setLighting] = useState('natural')
  const [angle, setAngle] = useState('eye-level')
  const [mood, setMood] = useState('neutral')

  useEffect(() => {
    const buildPrompt = () => {
      if (!subject.trim()) return ''

      const parts: string[] = []

      // Style
      if (style === 'photorealistic') {
        parts.push('A photorealistic, high-resolution photograph of')
      } else if (style === 'minimalist') {
        parts.push('A minimalist, clean composition featuring')
      } else if (style === 'artistic') {
        parts.push('An artistic, creative interpretation of')
      } else if (style === 'illustration') {
        parts.push('A professional illustration of')
      }

      // Subject
      parts.push(subject)

      // Angle
      if (angle === 'elevated') {
        parts.push('shot from a slightly elevated angle')
      } else if (angle === 'low-angle') {
        parts.push('shot from a low angle')
      } else if (angle === 'aerial') {
        parts.push('shot from an aerial perspective')
      }

      // Lighting
      if (lighting === 'studio') {
        parts.push('with professional studio lighting')
      } else if (lighting === 'natural') {
        parts.push('with soft, natural lighting')
      } else if (lighting === 'dramatic') {
        parts.push('with dramatic, high-contrast lighting')
      } else if (lighting === 'golden-hour') {
        parts.push('bathed in warm golden hour light')
      }

      // Mood
      if (mood === 'warm') {
        parts.push('creating a warm, inviting atmosphere')
      } else if (mood === 'cool') {
        parts.push('creating a cool, sophisticated atmosphere')
      } else if (mood === 'energetic') {
        parts.push('creating a vibrant, energetic mood')
      } else if (mood === 'serene') {
        parts.push('creating a calm, serene mood')
      }

      return parts.join(', ') + '.'
    }

    const prompt = buildPrompt()
    onPromptChange(prompt)
  }, [subject, style, lighting, angle, mood, onPromptChange])

  return (
    <Stack space={3}>
      <Text size={1} weight="semibold">
        Prompt Builder
      </Text>

      <Card padding={3} border radius={2}>
        <Stack space={3}>
          <Stack space={2}>
            <Text size={1} weight="semibold">
              Subject
            </Text>
            <TextInput
              placeholder="e.g., a ceramic coffee mug"
              value={subject}
              onChange={(e) => setSubject(e.currentTarget.value)}
            />
          </Stack>

          <Stack space={2}>
            <Text size={1} weight="semibold">
              Style
            </Text>
            <Select value={style} onChange={(e) => setStyle(e.currentTarget.value)}>
              <option value="photorealistic">Photorealistic</option>
              <option value="minimalist">Minimalist</option>
              <option value="artistic">Artistic</option>
              <option value="illustration">Illustration</option>
            </Select>
          </Stack>

          <Stack space={2}>
            <Text size={1} weight="semibold">
              Lighting
            </Text>
            <Select value={lighting} onChange={(e) => setLighting(e.currentTarget.value)}>
              <option value="natural">Natural</option>
              <option value="studio">Studio</option>
              <option value="dramatic">Dramatic</option>
              <option value="golden-hour">Golden Hour</option>
            </Select>
          </Stack>

          <Stack space={2}>
            <Text size={1} weight="semibold">
              Camera Angle
            </Text>
            <Select value={angle} onChange={(e) => setAngle(e.currentTarget.value)}>
              <option value="eye-level">Eye Level</option>
              <option value="elevated">Elevated</option>
              <option value="low-angle">Low Angle</option>
              <option value="aerial">Aerial</option>
            </Select>
          </Stack>

          <Stack space={2}>
            <Text size={1} weight="semibold">
              Mood
            </Text>
            <Select value={mood} onChange={(e) => setMood(e.currentTarget.value)}>
              <option value="neutral">Neutral</option>
              <option value="warm">Warm & Inviting</option>
              <option value="cool">Cool & Sophisticated</option>
              <option value="energetic">Energetic & Vibrant</option>
              <option value="serene">Calm & Serene</option>
            </Select>
          </Stack>
        </Stack>
      </Card>
    </Stack>
  )
}
