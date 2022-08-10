import 'type-fest'

module 'type-fest' {
  export namespace PackageJson {
    export interface NonStandardEntryPoints {
      packageManager?: string
      prettier?: string
    }
  }
}
