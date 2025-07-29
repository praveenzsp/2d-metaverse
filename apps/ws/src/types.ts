export type OutgoingMessage = {
	type: string;
	payload: any;
}

// Call state management types
export interface UserCallState {
	userId: string;
	username: string;
	callId: string | null;
	proximityUsers: string[];
	spaceId: string | null;
}

export interface CallInfo {
	callId: string;
	participants: Set<string>;
	spaceId: string;
	createdAt: Date;
	creatorId: string;
}

export interface CallParticipant {
	userId: string;
	username: string;
}

export interface ProximityUser {
	userId: string;
	username: string;
	x: number;
	y: number;
}

// WebSocket message types for call management
export interface CallManagementMessage {
	type: 'create-proximity-call' | 'join-proximity-call' | 'leave-proximity-call' | 'merge-calls' | 'split-calls';
	payload: any;
}

export interface ProximityCallPayload {
	spaceId: string;
	userId: string;
	proximityUsers: ProximityUser[];
}
