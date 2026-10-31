export * as HuntagentWorkerd from "./workerd"

import { Layer } from "effect"
import type { Config, Scope } from "effect"
import { WorkerdProfile } from "../internal/workerd"
import { Huntagent } from "./opencode"

export type Configuration = WorkerdProfile.Configuration

export interface CreateOptions<R = never> extends WorkerdProfile.Options {
  readonly log?: Huntagent.CreateOptions["log"]
  readonly plugins?: Huntagent.CreateOptions["plugins"]
  readonly workspaceProviders?: Huntagent.CreateOptions["workspaceProviders"]
  readonly instances?: Huntagent.CreateOptions<R>["instances"]
}

export const create = <R = never>({ log, plugins, workspaceProviders, instances, ...options }: CreateOptions<R>) => {
  const profile = WorkerdProfile.make(options)
  return Huntagent.create(
    { ...profile.options, log, plugins, workspaceProviders, instances },
    { overrides: profile.replacements },
  )
}

export const layer = <R = never>(
  options: CreateOptions<R>,
): Layer.Layer<Huntagent.Service, Config.ConfigError | Error, Exclude<R, Scope.Scope>> =>
  Layer.effect(Huntagent.Service, create(options))

export type Interface = Huntagent.Interface
export type Requirements = Scope.Scope
