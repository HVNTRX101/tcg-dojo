import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Search, ArrowUp, ArrowDown } from 'lucide-react';
import { Header } from '../components/Header';

interface CollectionItem {
  name: string;
  set: string;
  qty: number;
  min: string;
  avg: string;
  high: string;
}

const mockCollection: CollectionItem[] = [
  { name: 'Haves', set: '', qty: 0, min: '$0.00', avg: '$0.00', high: '$0.00' },
  { name: 'Wants', set: '', qty: 0, min: '$0.00', avg: '$0.00', high: '$0.00' },
  { name: 'Trades', set: '', qty: 0, min: '$0.00', avg: '$0.00', high: '$0.00' },
];

export default function CollectionTrackerPage() {
  const [game, setGame] = useState('All');
  const [setFilter, setSetFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [haveChecked, setHaveChecked] = useState(true);
  const [wantChecked, setWantChecked] = useState(true);
  const [tradeChecked, setTradeChecked] = useState(true);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
      {/* Beta Notice Banner */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h2 className="text-lg mb-2">BETA TEST</h2>
            <p className="text-gray-700 mb-3">
              The Collection Tracker is in "BETA TEST" mode. To report a bug please send us feedback here
            </p>
            <p className="text-gray-700 mb-3">
              Please let us know the Browser and version you are using along with the issue(s) you experienced. Feel free to include screenshots of the error as well!
            </p>
            <p className="text-gray-700 mb-3">
              Thank you for the feedback you have been giving us during the beta phase of this project. Please continue to send us feedback on the Collection Tracker
            </p>
            <div className="bg-white border border-gray-300 rounded p-3 mt-4">
              <h3 className="mb-2">Current Patch Notes</h3>
              <p className="text-gray-700">
                Corrected an issue that would cause some cards to disappear from your collection
                <br />
                Improved performance when searching
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="my-collection" className="mb-6">
          <TabsList>
            <TabsTrigger value="my-collection">My Collection</TabsTrigger>
            <TabsTrigger value="add-products">Add Products to Collection</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="help">Help / F.A.Q</TabsTrigger>
          </TabsList>

          <TabsContent value="my-collection" className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label>GAME</Label>
                  <Select value={game} onValueChange={setGame}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="Magic">Magic: The Gathering</SelectItem>
                      <SelectItem value="Pokemon">Pokémon</SelectItem>
                      <SelectItem value="Yu-Gi-Oh">Yu-Gi-Oh!</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>SET</Label>
                  <Select value={setFilter} onValueChange={setSetFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="lg:col-span-2">
                  <Label>SEARCH</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search cards..."
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-6">
                <Label className="text-sm">FILTER</Label>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="have"
                      checked={haveChecked}
                      onCheckedChange={(checked) => setHaveChecked(checked as boolean)}
                    />
                    <label htmlFor="have" className="text-sm">
                      HAVE
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="want"
                      checked={wantChecked}
                      onCheckedChange={(checked) => setWantChecked(checked as boolean)}
                    />
                    <label htmlFor="want" className="text-sm">
                      WANT
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="trade"
                      checked={tradeChecked}
                      onCheckedChange={(checked) => setTradeChecked(checked as boolean)}
                    />
                    <label htmlFor="trade" className="text-sm">
                      TRADE
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-4"></th>
                    <th className="text-right p-4">QTY</th>
                    <th className="text-right p-4">MIN</th>
                    <th className="text-right p-4">AVG</th>
                    <th className="text-right p-4">HIGH</th>
                  </tr>
                </thead>
                <tbody>
                  {mockCollection.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="p-4">{item.name}</td>
                      <td className="p-4 text-right">{item.qty}</td>
                      <td className="p-4 text-right">{item.min}</td>
                      <td className="p-4 text-right">{item.avg}</td>
                      <td className="p-4 text-right">{item.high}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Collection Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left p-4">
                        <div className="flex items-center gap-2">
                          <Checkbox />
                          <span>HAVE</span>
                          <ArrowUp className="h-4 w-4" />
                        </div>
                      </th>
                      <th className="text-left p-4">
                        <div className="flex items-center gap-2">
                          <span>WANT</span>
                          <ArrowUp className="h-4 w-4" />
                        </div>
                      </th>
                      <th className="text-left p-4">
                        <div className="flex items-center gap-2">
                          <span>TRADE</span>
                          <ArrowUp className="h-4 w-4" />
                        </div>
                      </th>
                      <th className="text-left p-4">
                        <div className="flex items-center gap-2">
                          <span>NAME</span>
                          <ArrowUp className="h-4 w-4" />
                        </div>
                      </th>
                      <th className="text-left p-4">SET</th>
                      <th className="text-right p-4">LOW</th>
                      <th className="text-right p-4">MED</th>
                      <th className="text-right p-4">HIGH</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-gray-500">
                        <div className="space-y-4">
                          <p>Welcome to the TCGplayer.com Collection Tracker!</p>
                          <ul className="text-left max-w-2xl mx-auto space-y-2">
                            <li>• Enter and store your entire gaming collection online</li>
                            <li>• Instantly view the high, mid and low values of your entire collection across multiple games</li>
                            <li>• Share your haves, wants and trades across multiple platforms such as our store, content site and our mobile affiliates (coming soon!)</li>
                            <li>• The Collection Tracker allows you to quickly track your gaming inventory by allowing easy hit and search function, product pages, and more. Simply click "Add Products to Collection" above and begin your collection - (View Full FAQ)</li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="add-products">
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              <p>Add products to your collection feature coming soon...</p>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              <p>Settings feature coming soon...</p>
            </div>
          </TabsContent>

          <TabsContent value="help">
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              <p>Help and FAQ coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </>
  );
}
