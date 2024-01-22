from PIL import Image, ImageDraw
import numpy as np
from skimage import filters, morphology, util
from scipy.spatial import Delaunay
import pandas as pd
from argparse import ArgumentParser

class LowPoly:
    def __init__(self, filename) -> None:
        #Open image as numpy array
        self.filename = filename
        self.pil_image = Image.open(filename).convert('RGBA')
        self.image = np.array(self.pil_image)
        self.grayscale_image = self.image[:,:,:3].dot([0.07, 0.72, 0.21]).astype("uint8")
        self.shape = self.grayscale_image.shape
        self.height, self.width = self.shape[:2]

    def __get_cornor_points(self):
        points = []
        points.append((0,0))
        points.append((self.width-1, 0))
        points.append((0,self.height-1))
        points.append((self.width-1,self.height-1))
        return points

    def __get_max_points(self, array):
        y, x = np.unravel_index(np.argmax(array), array.shape)
        return x,y

    def __gaussian_mask(self, x, y, shape, amplitude, sd):
        '''
            Return gaussian mask of given shape centered around x, y cordinate
        '''
        xv, yv = np.meshgrid(np.arange(shape[1]), np.arange(shape[0]))
        mask = amplitude * np.exp(-((xv - x) ** 2 + (yv - y) ** 2) / (2 * sd ** 2))
        return mask

    def generate_max_entropy_points(self, n_points):
        length_scale = np.sqrt(self.width*self.height / n_points)
        entropy_radius = length_scale*0.15
        gmask_aplitude = 3
        gmask_sd = length_scale * 0.3
        gfilter_radius = length_scale*0.1

        #Apply Gaussian filter on image to make it image smooth 
        smooth_image = util.img_as_ubyte(filters.gaussian(self.grayscale_image, gfilter_radius))
        
        #Appllying entropy filter
        filtered_image = filters.rank.entropy(smooth_image, morphology.disk(entropy_radius));

        points = []
        for i in range(n_points):
            x, y = self.__get_max_points(filtered_image)
            points.append((x,y))
            filtered_image -= self.__gaussian_mask(x, y, self.shape, gmask_aplitude, gmask_sd)

        self.points = np.array(points + self.__get_cornor_points())

    def generate_points_from_sobel(self, bgPoints, edgePoints):
        '''
            This is just generating uniform random points on the image and
            adding some points around edges to retain from valuable information of image.
            Why? -> It's a bit fast.
        '''
        smooth_image = filters.gaussian(self.grayscale_image, 3, preserve_range=True)
        sobel = filters.sobel(smooth_image)
        height, width = self.image.shape[:2]
        threshold = int(filters.threshold_triangle(sobel)*5)

        random_points = np.random.uniform(size=(bgPoints, 2))
        random_points *= np.array([width-1, height-1])

        edge_points = []
        for y in range(0, height, 2):
            for x in range(0, width, 2):
                sum = 0
                total = 0
                for row in range(-1, 2):
                    sy = y + row
                    if(sy >= 0 and sy < height):
                        for col in range(-1,2):
                            sx = x + col
                            if(sx >= 0 and sx < width):
                                sum += sobel[y,x];
                                total += 1
                
                if(total):
                    sum /= total
                    if(sum >= threshold):
                        edge_points.append((x,y))

        increment = max(int(len(edge_points)/edgePoints),1)
        edge_points = [edge_points[i] for i in range(0, len(edge_points), increment)]
      
        self.points = np.concatenate([random_points, np.array(edge_points + self.__get_cornor_points())])      

    def generate_triangles(self):
        self.triangles = Delaunay(self.points)

        #List of all pixel cordinate
        xv, yv = np.meshgrid(np.arange(self.width), np.arange(self.height))
        pixel_coords = np.c_[xv.ravel(), yv.ravel()]

        triangles_per_coord = self.triangles.find_simplex(pixel_coords)

        '''
            triangle |  r  |  g  |  b  | a |
                0    | 244 | 156 | 23  | 1 |
                1    | 242 | 256 | 22  | 1 |
                0    | 234 | 100 | 28  | 1 |
                2    | 123 | 199 | 23  | 1 |
            
            Create Pandas dataframe of each pixel in above format
            to easily group each pixel by the triangle they belong to and
            calculate the median of rgb values of each pixel on that each triangle.
        '''
        reshaped_image = self.image.reshape(-1, 4)
        df = pd.DataFrame({
            "triangle": triangles_per_coord,
            "r": reshaped_image[:, 0],
            "g": reshaped_image[:, 1],
            "b": reshaped_image[:, 2],
            "a": reshaped_image[:, 3]
        })

        n_triangles = self.triangles.simplices.shape[0]

        color_per_triangle = (
            df
                .groupby("triangle")[["r", "g", "b", "a"]]
                .aggregate("median")
                .reindex(range(n_triangles), fill_value=0)
        )

        self.triangles_color = color_per_triangle.values.astype("uint8")

def draw_triangles_in_image(lowpoly):
    draw = ImageDraw.Draw(lowpoly.pil_image)
    
    vertices = lowpoly.triangles.points
    for triangle, color in zip(lowpoly.triangles.simplices, lowpoly.triangles_color):
        if color[3] < 30:
            continue
        
        color_str = '#{:02X}{:02X}{:02X}{:02X}'.format(*[i for i in color])
        draw.polygon([(vertices[i][0], vertices[i][1]) for i in triangle], fill=color_str, outline=color_str)
    
    name = f"{lowpoly.filename.rsplit('.', 1)[0]}_lowpoly.png"
    lowpoly.pil_image.save(name)

if __name__=="__main__":

    parser = ArgumentParser(description='Genrate Lowpoly image')
    parser.add_argument('imagefile', metavar='ImageFile',
            help='Filepath of an image to convert.')
    parser.add_argument('-p', '--points', type=int, nargs='+', 
            help="""
                No of points used while generating triangle.
                Two arguments can be passed while using sobel method.
                Other arguments will be ignored.
                (More points = More details = More Processing Time)
                (Default: Calculated based on image size)
            """)
    parser.add_argument('-m', '--method', choices=['e', 's'], default='e',
            help='Method to get points, e for entropy method (slow but good result), s for sobel method; little bit fast')

    arguments = parser.parse_args()

    lowpoly = LowPoly(arguments.imagefile)

    #Generate Triangles
    points = 1
    bg_points = None
    if(arguments.points is None):
        points = max(points, int(lowpoly.width*lowpoly.height/2500)) # 1 point for 50x50px area
    else:
        points = arguments.points[0]
        if(len(arguments.points) >= 2):
            bg_points = arguments.points[1]
        else:
            bg_points = points
    
    if(arguments.method == 's'):
        lowpoly.generate_points_from_sobel(bg_points, points)
    else:
        lowpoly.generate_max_entropy_points(points)
    lowpoly.generate_triangles()

    draw_triangles_in_image(lowpoly)


    
