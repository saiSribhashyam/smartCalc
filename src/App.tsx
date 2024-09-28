import {createBrowserRouter,  RouterProvider} from 'react-router-dom'
import '@mantine/core/styles.css'

import {MantineProvider} from "@mantine/core"

import Home from './screens/home'

const paths=[
  {
    path:"/",
    element:(
      <Home/>
    ),
  },
];

const browserRouter= createBrowserRouter(paths)

const App=()=>{
  return(
    <MantineProvider>
      <RouterProvider router={browserRouter}></RouterProvider>
    </MantineProvider>
  )
}

export default App