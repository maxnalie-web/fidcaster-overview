// Excerpt from the private FidCaster repository: artifacts/farcaster-client/src/lib/hub-submit.ts
// Only the on-device signing function is shown; imports, types and helpers are omitted.

async function buildAndSignLocal(
  privateKey: Uint8Array,
  fid: number,
  action: FarcasterAction,
): Promise<{ bytes: string; hash: string }> {
  try {
    const {
      makeCastAdd, makeCastRemove, makeLinkAdd, makeLinkRemove, makeReactionAdd, makeReactionRemove,
      makeUserDataAdd, NobleEd25519Signer, FarcasterNetwork, UserDataType, CastType, Message: FcMessage,
    } = await import("@farcaster/core");
    const signer = new NobleEd25519Signer(privateKey);
    const opts   = { fid, network: FarcasterNetwork.MAINNET };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    if (action.type === "like") {
      result = await makeReactionAdd(
        { type: 1, targetCastId: { fid: action.castAuthorFid, hash: hexToBytes(action.castHash) } },
        opts, signer,
      );
    } else if (action.type === "unlike") {
      result = await makeReactionRemove(
        { type: 1, targetCastId: { fid: action.castAuthorFid, hash: hexToBytes(action.castHash) } },
        opts, signer,
      );
    } else if (action.type === "recast") {
      result = await makeReactionAdd(
        { type: 2, targetCastId: { fid: action.castAuthorFid, hash: hexToBytes(action.castHash) } },
        opts, signer,
      );
    } else if (action.type === "unrecast") {
      result = await makeReactionRemove(
        { type: 2, targetCastId: { fid: action.castAuthorFid, hash: hexToBytes(action.castHash) } },
        opts, signer,
      );
    } else if (action.type === "follow") {
      result = await makeLinkAdd({ type: "follow", targetFid: action.targetFid }, opts, signer);
    } else if (action.type === "unfollow") {
      result = await makeLinkRemove({ type: "follow", targetFid: action.targetFid }, opts, signer);
    } else if (action.type === "delete-cast") {
      result = await makeCastRemove({ targetHash: hexToBytes(action.castHash) }, opts, signer);
    } else if (action.type === "update-user-data") {
      const typeMap: Record<string, UserDataType> = {
        pfp: UserDataType.PFP, display: UserDataType.DISPLAY, bio: UserDataType.BIO,
        banner: UserDataType.BANNER,
      };
      result = await makeUserDataAdd({ type: typeMap[action.dataType], value: action.value }, opts, signer);
    } else {
      const cast = action as { type: "cast"; text: string; embeds?: CastEmbed[]; parentHash?: string; parentFid?: number; parentUrl?: string; mentions?: number[]; mentionsPositions?: number[] };
      result = await makeCastAdd({
        type: utf8ByteLength(cast.text) > 320 ? CastType.LONG_CAST : CastType.CAST,
        text: cast.text,
        embeds: (cast.embeds ?? []).map((e) =>
          typeof e === "string" ? { url: e } : { castId: { fid: e.castId.fid, hash: hexToBytes(e.castId.hash) } }),
        embedsDeprecated: [], mentions: cast.mentions ?? [], mentionsPositions: cast.mentionsPositions ?? [],
        ...(cast.parentHash && cast.parentFid
          ? { parentCastId: { fid: cast.parentFid, hash: hexToBytes(cast.parentHash) } }
          : cast.parentUrl ? { parentUrl: cast.parentUrl } : {}),
      }, opts, signer);
    }

    if (!result || result.isErr()) {
      throw new Error(`INVALID_MESSAGE · ${result?.error?.message ?? "unknown"}`);
    }

    const message = result.value as Message;
    return {
      bytes: btoa(String.fromCharCode(...FcMessage.encode(message).finish())),
      hash:  toHex(message.hash),
    };
  } finally {
    // The caller passes a copy; wipe it however this ends, including when the
    // library itself could not be loaded.
    privateKey.fill(0);
  }
