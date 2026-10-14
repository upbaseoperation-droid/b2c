import React from 'react';
import { Composition } from 'remotion';
import { Video, DURATION } from './Video';

export const RemotionRoot: React.FC = () => (
  <Composition id="MasterData" component={Video} durationInFrames={DURATION} fps={30} width={1920} height={1080} />
);
