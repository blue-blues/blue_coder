import { Controller } from "../index"
import * as proto from "@/shared/proto"
import { updateGlobalState } from "../../storage/state"

export async function updateTerminalReuseEnabled(
	controller: Controller,
	request: proto.bluesaicoder.BooleanRequest,
): Promise<proto.bluesaicoder.Empty> {
	const enabled = request.value

	// Update the terminal reuse setting in the state
	await updateGlobalState(controller.context, "terminalReuseEnabled", enabled)

	// Broadcast state update to all webviews
	await controller.postStateToWebview()

	return proto.bluesaicoder.Empty.create({})
}
