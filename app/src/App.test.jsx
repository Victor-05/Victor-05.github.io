// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import App from './App.jsx'

beforeAll(() => {
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }
  Element.prototype.scrollIntoView = () => {}
  window.scrollTo = () => {}
})

describe('App flow', () => {
  it('shows validation errors on empty submit, then evaluates demo and submits lead', async () => {
    window.location.hash = '#/evaluator'
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /Evaluează compatibilitatea/i }, { timeout: 5000 }))
    expect(await screen.findByText(/Introduceți numele companiei/)).toBeTruthy()
    expect(screen.getByText(/Introduceți ritmul liniei/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Completează exemplu/i }))
    fireEvent.click(screen.getByRole('button', { name: /Evaluează compatibilitatea/i }))
    expect(await screen.findByText('Compatibil cu cazul de referință')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Solicită evaluare tehnică/i }))
    fireEvent.click(await screen.findByRole('button', { name: /Trimite solicitarea/i }))
    expect(await screen.findByText(/Introduceți adresa de e-mail/)).toBeTruthy()

    fireEvent.change(screen.getByLabelText(/Nume și prenume/), { target: { value: 'Ana Test' } })
    fireEvent.change(screen.getByLabelText(/E-mail/), { target: { value: 'ana@exemplu.ro' } })
    fireEvent.change(screen.getByLabelText(/Data preferată/), { target: { value: '2099-01-15' } })
    fireEvent.click(screen.getByRole('checkbox'))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Trimite solicitarea/i })) })
    expect(await screen.findByText(/^TC-\d{4}$/)).toBeTruthy()
    expect(JSON.parse(localStorage.getItem('ur20-leads')).length).toBe(1)
  })
})

describe('routing', () => {
  it('deep link #/digital-twin renders the simulator; landing falls back to static story in jsdom (no WebGL)', async () => {
    window.location.hash = '#/digital-twin'
    const { unmount } = render(<App />)
    expect(await screen.findByText(/Panou de control/, {}, { timeout: 10000 })).toBeTruthy()
    unmount()
    window.location.hash = '#/'
    render(<App />)
    expect(await screen.findByTestId('story-static', {}, { timeout: 10000 })).toBeTruthy()
  }, 30000)
})
