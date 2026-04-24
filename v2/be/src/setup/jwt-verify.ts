import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { env, keycloak_issuer } from '@src/env';

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

const get_jwks = () => {
  if (jwks) return jwks;
  const issuer = keycloak_issuer();
  if (!issuer) throw { code: 500, message: 'Keycloak not configured (KEYCLOAK_URL + KEYCLOAK_REALM required)' };
  jwks = createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`));
  return jwks;
};

export type KeycloakClaims = JWTPayload & {
  sub:                string;
  azp?:               string;
  email?:             string;
  preferred_username?: string;
  name?:              string;
  given_name?:        string;
  family_name?:       string;
  realm_access?:      { roles: string[] };
  resource_access?:   Record<string, { roles: string[] }>;
};

const verify_azp = (claims: KeycloakClaims) => {
  if (!env.KEYCLOAK_CLIENT_ID) return;
  if (claims.azp && claims.azp !== env.KEYCLOAK_CLIENT_ID) {
    throw { code: 401, message: `Token azp "${claims.azp}" does not match KEYCLOAK_CLIENT_ID "${env.KEYCLOAK_CLIENT_ID}"` };
  }
};

export const verify_bearer_token = async (token: string): Promise<KeycloakClaims> => {
  const issuer = keycloak_issuer();
  const { payload } = await jwtVerify(token, get_jwks(), { issuer: issuer ?? undefined });
  verify_azp(payload as KeycloakClaims);
  return payload as KeycloakClaims;
};
