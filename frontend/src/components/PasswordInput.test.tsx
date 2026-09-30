import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PasswordInput from './PasswordInput'

describe('PasswordInput', () => {
  it('hides the password until the eye button is pressed', async () => {
    render(<PasswordInput id="pw" value="secret" onChange={() => {}} />)
    const input = document.getElementById('pw') as HTMLInputElement
    expect(input.type).toBe('password')

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input.type).toBe('text')

    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input.type).toBe('password')
  })

  it('passes typing through to onChange', async () => {
    const onChange = vi.fn()
    render(<PasswordInput id="pw" value="" onChange={onChange} />)
    await userEvent.type(document.getElementById('pw')!, 'a')
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
