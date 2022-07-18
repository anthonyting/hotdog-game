interface BackgroundProps {
  backgroundUrl: string;
}

export const Background: React.FC<BackgroundProps> = ({ backgroundUrl }) => {
  return (
    <div
      style={{
        backgroundImage: `url(${backgroundUrl})`,
        opacity: '0.5',
        position: 'fixed',
        height: '100%',
        width: '100%',
        zIndex: '-1',
        backgroundSize: 'cover',
      }}
    ></div>
  );
};
