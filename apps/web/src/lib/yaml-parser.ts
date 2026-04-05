import yaml from 'js-yaml'

export function parseYaml(content: string): unknown {
  try {
    return yaml.load(content)
  } catch (err) {
    const yamlErr = err as { mark?: { line?: number } }
    const line = yamlErr.mark?.line !== undefined ? yamlErr.mark.line + 1 : undefined
    throw new Error(
      line
        ? `Arquivo inválido: erro de sintaxe YAML na linha ${line}`
        : 'Arquivo inválido: erro de sintaxe YAML',
    )
  }
}
