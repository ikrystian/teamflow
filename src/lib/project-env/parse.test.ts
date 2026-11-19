import { describe, expect, it } from "vitest"
import { countEnvVariables } from "./parse"

describe("countEnvVariables", () => {
  it("liczy zwykłe zmienne", () => {
    expect(countEnvVariables("A=1\nB=2\nC=")).toBe(3)
  })

  it("pomija puste linie i komentarze", () => {
    expect(countEnvVariables("# komentarz\n\n   \n  # wcięty komentarz\nA=1\n# B=2")).toBe(1)
  })

  it("obsługuje prefiks export i wcięcia", () => {
    expect(countEnvVariables("export A=1\n  B = 2\nexport   C=3")).toBe(3)
  })

  it("nie myli znaku = w wartości z nową zmienną", () => {
    expect(countEnvVariables("URL=postgres://u:p@h/db?a=1&b=2")).toBe(1)
  })

  it("obsługuje końce linii CRLF", () => {
    expect(countEnvVariables("A=1\r\nB=2\r\n")).toBe(2)
  })

  it("ignoruje linie, które nie są zmiennymi", () => {
    expect(countEnvVariables("to nie jest zmienna\n=bez-nazwy\n1ABC=cyfra-na-poczatku")).toBe(0)
  })

  it("zwraca 0 dla pustej treści", () => {
    expect(countEnvVariables("")).toBe(0)
  })
})
