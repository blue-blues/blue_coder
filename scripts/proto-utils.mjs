#!/usr/bin/env node

import * as fs from "fs/promises"
import * as path from "path"
import * as grpc from "@grpc/grpc-js"
import * as protoLoader from "@grpc/proto-loader"

const DESCRIPTOR_SET = path.resolve("dist-standalone/proto/descriptor_set.pb")

const typeNameToFQN = new Map()

function addTypeNameToFqn(name, fqn) {
	if (typeNameToFQN.has(name)) {
		throw new Error(`Proto type ${name} redefined (${fqn}).`)
	}
	typeNameToFQN.set(name, fqn)
}
// Get the fully qualified name for a proto type, e.g. getFqn('StringRequest') returns 'bluesaicoder.StringRequest'
export function getFqn(name) {
	if (!typeNameToFQN.has(name)) {
		throw Error(`No FQN for ${name}`)
	}
	return typeNameToFQN.get(name)
}

export async function loadServicesFromProtoDescriptor() {
	// Load service definitions from descriptor set
	const descriptorBuffer = await fs.readFile(DESCRIPTOR_SET)
	const packageDefinition = protoLoader.loadFileDescriptorSetFromBuffer(descriptorBuffer)
	const proto = grpc.loadPackageDefinition(packageDefinition)

	// Extract host services and proto messages from the proto definition
	const hostServices = {}
	for (const [name, def] of Object.entries(proto.host)) {
		if (def && "service" in def) {
			hostServices[name] = def
		} else {
			addTypeNameToFqn(name, `proto.host.${name}`)
		}
	}
	const protobusServices = {}
	for (const [name, def] of Object.entries(proto.bluesaicoder)) {
		if (def && "service" in def) {
			protobusServices[name] = def
		} else {
			addTypeNameToFqn(name, `proto.bluesaicoder.${name}`)
		}
	}
	return { protobusServices, hostServices }
}
