import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchBar } from './SearchBar'

describe('SearchBar component', () => {
  it('renders input with placeholder', () => {
    render(<SearchBar onSubmit={vi.fn()} />)
    expect(screen.getByPlaceholderText(/tempel tautan media/i)).toBeInTheDocument()
  })

  it('shows detected platform chip when typing supported link', () => {
    render(<SearchBar onSubmit={vi.fn()} />)
    const input = screen.getByPlaceholderText(/tempel tautan media/i)
    fireEvent.change(input, { target: { value: 'https://www.tiktok.com/@creator/video/123' } })
    expect(screen.getByText(/media · tiktok/i)).toBeInTheDocument()
  })

  it('triggers onSubmit when Enter key is pressed with valid input', () => {
    const handleSubmit = vi.fn()
    render(<SearchBar onSubmit={handleSubmit} />)
    const input = screen.getByPlaceholderText(/tempel tautan media/i)
    fireEvent.change(input, { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    expect(handleSubmit).toHaveBeenCalledWith('https://youtu.be/dQw4w9WgXcQ')
  })

  it('triggers onSubmit when button is clicked', () => {
    const handleSubmit = vi.fn()
    render(<SearchBar onSubmit={handleSubmit} />)
    const input = screen.getByPlaceholderText(/tempel tautan media/i)
    fireEvent.change(input, { target: { value: 'https://instagram.com/reel/123' } })
    const button = screen.getByRole('button', { name: /analisis/i })
    fireEvent.click(button)
    expect(handleSubmit).toHaveBeenCalledWith('https://instagram.com/reel/123')
  })
})
