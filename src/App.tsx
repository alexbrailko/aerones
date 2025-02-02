import VideoPlayer from './components/VideoPlayer';
import metadata from '../metadata.json';

const App = () => {
  const videoUrl = '../GS012237-stitched.mp4';

  return (
    <div className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-4'>Wind Turbine Blade Inspection</h1>
      <VideoPlayer videoUrl={videoUrl} metadata={metadata} />
    </div>
  );
};

export default App;
