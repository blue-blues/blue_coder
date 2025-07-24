import { Controller } from "../index"
import * as proto from "@/shared/proto"
import { getAvailableTerminalProfiles as getTerminalProfilesFromShell } from "../../../utils/shell"

export async function getAvailableTerminalProfiles(
	controller: Controller,
	request: proto.bluesaicoder.EmptyRequest,
): Promise<proto.bluesaicoder.TerminalProfiles> {
	const profiles = getTerminalProfilesFromShell()

	return proto.bluesaicoder.TerminalProfiles.create({
		profiles: profiles.map((profile) => ({
			id: profile.id,
			name: profile.name,
			path: profile.path || "",
			description: profile.description || "",
		})),
	})
}
