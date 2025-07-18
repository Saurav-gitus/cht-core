export function getTypeId(doc: Record<string, unknown>): string | undefined;
export function getTypeById(config: Record<string, unknown>, typeId: string): Record<string, unknown> | null;
export function isPersonType(type: Record<string, unknown>): boolean;
export function isPlaceType(type: Record<string, unknown>): boolean;
export function hasParents(type: Record<string, unknown>): boolean;
export function isParentOf(parentType: string | Record<string, unknown>, childType: Record<string, unknown>): boolean;
export function getLeafPlaceTypes(config: Record<string, unknown>): Record<string, unknown>[];
export function getContactType(config: Record<string, unknown>, contact: Record<string, unknown>):
Record<string, unknown> | undefined;
export function isPerson(config: Record<string, unknown>, contact: Record<string, unknown>): boolean;
export function isPlace(config: Record<string, unknown>, contact: Record<string, unknown>): boolean;
export function isContact(config: Record<string, unknown>, contact: Record<string, unknown>): boolean;
export function isHardcodedType(type: string): boolean;
export declare const HARDCODED_TYPES: string[];
export function getContactTypes(config?: Record<string, unknown>): Record<string, unknown>[];
export function getContactTypeIds(config?: Record<string, unknown>): string[];
export function getChildren(config?: Record<string, unknown>, parentType?: string | Record<string, unknown>):
Record<string, unknown>[];
export function getPlaceTypes(config?: Record<string, unknown>): Record<string, unknown>[];
export function getPersonTypes(config?: Record<string, unknown>): Record<string, unknown>[];
